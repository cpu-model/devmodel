#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument, PDFName, PDFHexString, PDFString, StandardFonts, rgb, degrees} from 'pdf-lib';

const out=path.resolve(process.argv[2]||'output/model');
const data=JSON.parse(fs.readFileSync(path.join(out,'model.json'),'utf8'));
const names=['context','pulse','ui','deployment'];
const scale=.75;

const hex=value=>{
  if(!value||value==='none'||value==='transparent') return undefined;
  const m=value.match(/^#([0-9a-f]{6})$/i); if(!m) return undefined;
  const n=parseInt(m[1],16); return rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);
};
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([:\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const style=a=>Object.fromEntries((a.style||'').split(';').filter(Boolean).map(x=>x.split(':').map(y=>y.trim())));
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>');
const pdfText=s=>s.replaceAll('▶','>').replaceAll('●','*').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');
const box=svg=>{const m=svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);if(!m)throw Error('SVG has no viewBox');const [x,y,w,h]=m[1].split(/\s+/).map(Number);return{x,y,w,h};};
const yPdf=(b,y)=>(b.y+b.h-y)*scale;
function addAnnot(page,doc,obj){let a=page.node.lookup(PDFName.of('Annots'));if(!a){a=doc.context.obj([]);page.node.set(PDFName.of('Annots'),a);}a.push(doc.context.register(doc.context.obj(obj)));}
function pathGeometry(d){
  const tokens=[...d.matchAll(/[MLSC]|[-+]?(?:\\d*\\.\\d+|\\d+)/g)].map(m=>m[0]);
  let i=0,cmd=null,current=null,lastStart=null,lastEnd=null;
  while(i<tokens.length){
    if(/^[MLSC]$/.test(tokens[i]))cmd=tokens[i++];
    if(cmd==='M'||cmd==='L'){
      const p={x:+tokens[i++],y:+tokens[i++]};lastStart=current;current=p;lastEnd=p;
    }else if(cmd==='S'){
      const control={x:+tokens[i++],y:+tokens[i++]},p={x:+tokens[i++],y:+tokens[i++]};lastStart=control;current=p;lastEnd=p;
    }else if(cmd==='C'){
      i+=2;const control={x:+tokens[i++],y:+tokens[i++]},p={x:+tokens[i++],y:+tokens[i++]};lastStart=control;current=p;lastEnd=p;
    }else break;
  }
  return lastEnd&&lastStart?{end:lastEnd,tangentFrom:lastStart}:null;
}
function arrow(page,b,a){
  if(!a['marker-end'])return;
  const g=pathGeometry(a.d);if(!g)return;
  const {end,tangentFrom:prev}=g,angle=Math.atan2(end.y-prev.y,end.x-prev.x);
  const refX=7,tip=10-refX,len=10,w=6;
  const tipPoint={x:end.x+tip*Math.cos(angle),y:end.y+tip*Math.sin(angle)};
  const base={x:tipPoint.x-len*Math.cos(angle),y:tipPoint.y-len*Math.sin(angle)};
  const p1={x:base.x+w*Math.sin(angle),y:base.y-w*Math.cos(angle)};
  const p2={x:base.x-w*Math.sin(angle),y:base.y+w*Math.cos(angle)};
  const pts=[tipPoint,p1,p2];if(pts.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;
  page.drawSvgPath(`M ${tipPoint.x} ${tipPoint.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`,{x:-b.x*scale,y:(b.y+b.h)*scale,scale,color:hex(a.stroke)||rgb(13/255,50/255,178/255)});
}

const doc=await PDFDocument.create();
const regular=await doc.embedFont(StandardFonts.Helvetica);
const bold=await doc.embedFont(StandardFonts.HelveticaBold);
const italic=await doc.embedFont(StandardFonts.HelveticaOblique);

for(const name of names){
  const svg=fs.readFileSync(path.join(out,name+'.svg'),'utf8');
  const b=box(svg);
  const page=doc.addPage([b.w*scale,b.h*scale]);
  page.drawRectangle({x:0,y:0,width:b.w*scale,height:b.h*scale,color:rgb(1,1,1)});

  // Draw SVG rectangles explicitly. pdf-lib defaults rectangle fill to black
  // when color is omitted, so never call drawRectangle without an explicit
  // fill color. SVG fill="none" becomes transparent (opacity 0).
  for(const m of svg.matchAll(/<rect\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);if(a['aria-hidden']==='true')continue;
    const x=(+a.x-b.x)*scale,y=yPdf(b,+a.y+(+a.height)),w=(+a.width)*scale,h=(+a.height)*scale;
    const rawFill=a.fill||s.fill,fill=hex(rawFill),stroke=hex(a.stroke||s.stroke);
    const o={x,y,width:w,height:h,color:fill||rgb(1,1,1),opacity:fill?1:0};
    if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;o.borderOpacity=1;}
    page.drawRectangle(o);
  }
  for(const m of svg.matchAll(/<path\\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);if(a.stroke==='transparent'||a['aria-hidden']==='true')continue;
    const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    // Keep connection paths omitted during this diagnostic phase, but render
    // filled shape paths such as the Context "Användare" actor symbol.
    if(!fill)continue;
    const o={x:-b.x*scale,y:(b.y+b.h)*scale,scale,color:fill};
    if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawSvgPath(a.d,o);
  }
  for(const m of svg.matchAll(/<circle\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    const o={x:(+a.cx-b.x)*scale,y:yPdf(b,+a.cy),size:(+a.r)*scale};if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawCircle(o);
  }
  for(const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)){
    const a=attrs('<text '+m[1]+'>'),s=style(a),raw=m[2],size=+(a['font-size']||s['font-size']?.replace('px','')||16)*scale;
    const font=(a.class||'').includes('text-bold')?bold:(a.class||'').includes('text-italic')?italic:regular,anchor=a['text-anchor']||s['text-anchor'],color=hex(a.fill||s.fill)||rgb(0,0,0);
    const spans=[...raw.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    const lines=spans.length?spans.map(t=>{const ta=attrs('<tspan '+t[1]+'>');return{x:+(ta.x??a.x),dy:+(ta.dy||0),text:pdfText(decode(t[2].replace(/<[^>]+>/g,'')).trim())};}):[{x:+a.x,dy:0,text:pdfText(decode(raw.replace(/<[^>]+>/g,'')).trim())}];
    let yy=+a.y;for(const line of lines){yy+=line.dy; if(!line.text)continue;let x=(line.x-b.x)*scale,w=font.widthOfTextAtSize(line.text,size);if(anchor==='middle')x-=w/2;else if(anchor==='end')x-=w;page.drawText(line.text,{x,y:yPdf(b,yy)-size*.22,size,font,color});}
  }

  const re=/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\S]*?)<\/g>/g;
  const annotationRefs=[];
  for(const m of svg.matchAll(re)){
    const ga=attrs('<g '+m[1]+'>'),circle=m[2].match(/<circle\b[^>]*>/);if(!circle)continue;const ca=attrs(circle[0]);
    const x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale,key=decode(ga['data-key']||''),label=decode(ga['data-label']||key);
    const reqs=data.requirements[key];
    if(!Array.isArray(reqs)||!reqs.length)throw Error('Requirement badge has no requirements: '+key);
    const annot=doc.context.obj({
      Type:PDFName.of('Annot'),
      Subtype:PDFName.of('Text'),
      Rect:[x+.5*r,y+.866*r,x+.5*r+20,y+.866*r+20],
      Contents:PDFHexString.fromText(reqs.join('\n\n')),
      T:PDFHexString.fromText(label),
      Name:PDFName.of('Comment'),
      Open:false,
      F:4,
    });
    annotationRefs.push(doc.context.register(annot));
  }
  if(annotationRefs.length)page.node.set(PDFName.of('Annots'),doc.context.obj(annotationRefs));
  console.log('Native PDF annotations:',{page:name,count:annotationRefs.length});
}
fs.writeFileSync(path.join(out,'review-native.pdf'),await doc.save({useObjectStreams:false}));
console.log('Experimental native PDF review ready:',path.join(out,'review-native.pdf'));
