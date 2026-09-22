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
function pathEnd(d){const nums=[...d.matchAll(/[-+]?(?:\d*\.\d+|\d+)/g)].map(m=>+m[0]);return nums.length>=2?{x:nums.at(-2),y:nums.at(-1)}:null;}
function pathPrev(d){const pts=[...d.matchAll(/(?:M|L)\s*([-+\d.]+)\s+([-+\d.]+)/g)].map(m=>({x:+m[1],y:+m[2]}));return pts.length>=2?pts.at(-2):null;}
function arrow(page,b,a){if(!a['marker-end'])return;const end=pathEnd(a.d),prev=pathPrev(a.d);if(!end||!prev)return;const angle=Math.atan2(end.y-prev.y,end.x-prev.x);const len=9,w=5;const p1={x:end.x-len*Math.cos(angle)+w*Math.sin(angle),y:end.y-len*Math.sin(angle)-w*Math.cos(angle)};const p2={x:end.x-len*Math.cos(angle)-w*Math.sin(angle),y:end.y-len*Math.sin(angle)+w*Math.cos(angle)};page.drawSvgPath(`M ${(end.x-b.x)*scale} ${yPdf(b,end.y)} L ${(p1.x-b.x)*scale} ${yPdf(b,p1.y)} L ${(p2.x-b.x)*scale} ${yPdf(b,p2.y)} Z`,{color:hex(a.stroke)||rgb(13/255,50/255,178/255)});}

const doc=await PDFDocument.create();
const regular=await doc.embedFont(StandardFonts.Helvetica);
const bold=await doc.embedFont(StandardFonts.HelveticaBold);
const italic=await doc.embedFont(StandardFonts.HelveticaOblique);

for(const name of names){
  const svg=fs.readFileSync(path.join(out,name+'.svg'),'utf8');
  const b=box(svg);
  const page=doc.addPage([b.w*scale,b.h*scale]);

  for(const m of svg.matchAll(/<rect\b[^>]*>/g)){
    const a=attrs(m[0]), s=style(a); if(a['aria-hidden']==='true')continue;
    const x=(+a.x-b.x)*scale,y=yPdf(b,+a.y+(+a.height)),w=(+a.width)*scale,h=(+a.height)*scale;
    const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    const o={x,y,width:w,height:h}; if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawRectangle(o);
  }
  for(const m of svg.matchAll(/<path\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a); if(a.stroke==='transparent'||a['aria-hidden']==='true')continue;
    const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    if(!fill&&!stroke)continue;
    const o={x:-b.x*scale,y:(b.y+b.h)*scale,scale}; if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawSvgPath(a.d,o);
    arrow(page,b,a);
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
  let badgeIndex=0;
  for(const m of svg.matchAll(re)){
    const ga=attrs('<g '+m[1]+'>'),circle=m[2].match(/<circle\b[^>]*>/);if(!circle)continue;const ca=attrs(circle[0]);
    const x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale,key=decode(ga['data-key']||''),label=decode(ga['data-label']||key);
    if(name==='context' && badgeIndex===0){
      const reqs=data.requirements[key];
      if(!Array.isArray(reqs)||!reqs.length)throw Error('First Context requirement badge has no requirements: '+key);
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
      const ref=doc.context.register(annot);
      page.node.set(PDFName.of('Annots'),doc.context.obj([ref]));
      console.log('Native PDF diagnostic annotation:',{page:name,key,label,requirements:reqs.length,x,y});
    }
    badgeIndex++;
  }
}
fs.writeFileSync(path.join(out,'review-native.pdf'),await doc.save({useObjectStreams:false}));
console.log('Experimental native PDF review ready:',path.join(out,'review-native.pdf'));
