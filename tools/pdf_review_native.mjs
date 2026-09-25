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
  if(value.toLowerCase()==='white') return rgb(1,1,1);
  if(value.toLowerCase()==='black') return rgb(0,0,0);
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
  const tokens=[...d.matchAll(/[MLSC]|[-+]?(?:\d*\.\d+|\d+)/g)].map(m=>m[0]);
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
  const len=10,w=6;
  const base={x:end.x-len*Math.cos(angle),y:end.y-len*Math.sin(angle)};
  const p1={x:base.x+w*Math.sin(angle),y:base.y-w*Math.cos(angle)};
  const p2={x:base.x-w*Math.sin(angle),y:base.y+w*Math.cos(angle)};
  const pdf=p=>({x:(p.x-b.x)*scale,y:yPdf(b,p.y)});
  const tip=pdf(end),a1=pdf(p1),a2=pdf(p2);
  const color=hex(a.stroke)||rgb(13/255,50/255,178/255);
  page.drawLine({start:tip,end:a1,color,thickness:2*scale});
  page.drawLine({start:a1,end:a2,color,thickness:2*scale});
  page.drawLine({start:a2,end:tip,color,thickness:2*scale});
}

for(const name of names){
  const doc=await PDFDocument.create();
  const regular=await doc.embedFont(StandardFonts.Helvetica);
  const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const italic=await doc.embedFont(StandardFonts.HelveticaOblique);
  const svg=fs.readFileSync(path.join(out,name+'.svg'),'utf8');
  const b=box(svg);
  // Requirement badges are part of the normative diagram and remain visible.
  // PDF annotations add popup interaction without owning marker placement.
  const visibleSvg=svg;
  const page=doc.addPage([b.w*scale,b.h*scale]);
  page.drawRectangle({x:0,y:0,width:b.w*scale,height:b.h*scale,color:rgb(1,1,1)});

  // Draw SVG rectangles explicitly. pdf-lib defaults rectangle fill to black
  // when color is omitted, so never call drawRectangle without an explicit
  // fill color. SVG fill="none" becomes transparent (opacity 0).
  const svgWithoutMasks=visibleSvg.replace(/<mask\b[^>]*>[\s\S]*?<\/mask>/g,'');
  const rectTags=[...svgWithoutMasks.matchAll(/<rect\b[^>]*>/g)];
  for(const m of rectTags){
    const a=attrs(m[0]),s=style(a);if(a['aria-hidden']==='true')continue;
    const x=(+a.x-b.x)*scale,y=yPdf(b,+a.y+(+a.height)),w=(+a.width)*scale,h=(+a.height)*scale;
    const rawFill=a.fill||s.fill;
    if(rawFill==='transparent'||rawFill==='none')continue;
    const fill=hex(rawFill)||rgb(1,1,1),stroke=hex(a.stroke||s.stroke);
    const o={x,y,width:w,height:h,color:fill,opacity:1};
    const borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;
    const dash=(s['stroke-dasharray']||a['stroke-dasharray']||'').split(/[ ,]+/).map(Number).filter(value=>Number.isFinite(value)&&value>0);
    if(stroke&&!dash.length){o.borderColor=stroke;o.borderWidth=borderWidth;o.borderOpacity=1;}
    page.drawRectangle(o);
    if(stroke){
      // Preserve visible boxes for the final paint-order pass. Dashed SVG
      // rectangle borders are redrawn explicitly because pdf-lib rectangles
      // do not expose a dash pattern.
      (page.__boxes??=[]).push({x,y,width:w,height:h,color:fill,opacity:1,borderColor:stroke,borderWidth,borderOpacity:1,dash});
    }
  }
  const maskBlackRects=[...svg.matchAll(/<mask\b[^>]*>([\s\S]*?)<\/mask>/g)].flatMap(mm=>[...mm[1].matchAll(/<rect\b[^>]*fill="black"[^>]*>/g)].map(r=>attrs(r[0])));
  for(const m of visibleSvg.matchAll(/<path\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);if(a.stroke==='transparent'||a['aria-hidden']==='true')continue;
    const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    // Render filled shape paths such as the Context "Användare" actor symbol.
    if(!fill){
      // D2 connection paths are fill="none". Render this orthogonal M/L/S
      // subset as native PDF line segments so no implicit black fill can occur.
      if(!stroke)continue;
      const tokens=[...a.d.matchAll(/[MLSC]|[-+]?(?:\d*\.\d+|\d+)/g)].map(x=>x[0]);
      let i=0,cmd=null,current=null,previousControl=null;
      const thickness=+(s['stroke-width']||a['stroke-width']||1)*scale;
      while(i<tokens.length){
        if(/^[MLSC]$/.test(tokens[i]))cmd=tokens[i++];
        if(cmd==='M'){current={x:+tokens[i++],y:+tokens[i++]};previousControl=null;continue;}
        if(cmd==='L'){
          const p={x:+tokens[i++],y:+tokens[i++]};
          page.drawLine({start:{x:(current.x-b.x)*scale,y:yPdf(b,current.y)},end:{x:(p.x-b.x)*scale,y:yPdf(b,p.y)},color:stroke,thickness});
          current=p;previousControl=null;continue;
        }
        if(cmd==='S'){
          const c2={x:+tokens[i++],y:+tokens[i++]},p={x:+tokens[i++],y:+tokens[i++]};
          // D2 uses S only for small rounded orthogonal corners. Approximate
          // the curve with short native line segments so the route follows
          // the actual SVG instead of jumping between non-adjacent L points.
          const c1=previousControl?{x:2*current.x-previousControl.x,y:2*current.y-previousControl.y}:current;
          let prev=current;
          for(let step=1;step<=4;step++){
            const t=step/4,u=1-t;
            const q={x:u*u*u*current.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*p.x,y:u*u*u*current.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*p.y};
            page.drawLine({start:{x:(prev.x-b.x)*scale,y:yPdf(b,prev.y)},end:{x:(q.x-b.x)*scale,y:yPdf(b,q.y)},color:stroke,thickness});
            prev=q;
          }
          current=p;previousControl=c2;continue;
        }
        if(cmd==='C'){
          const c1={x:+tokens[i++],y:+tokens[i++]},c2={x:+tokens[i++],y:+tokens[i++]},p={x:+tokens[i++],y:+tokens[i++]};
          let prev=current;
          for(let step=1;step<=8;step++){
            const t=step/8,u=1-t;
            const q={x:u*u*u*current.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*p.x,y:u*u*u*current.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*p.y};
            page.drawLine({start:{x:(prev.x-b.x)*scale,y:yPdf(b,prev.y)},end:{x:(q.x-b.x)*scale,y:yPdf(b,q.y)},color:stroke,thickness});
            prev=q;
          }
          current=p;previousControl=c2;continue;
        }
        break;
      }
      // D2 masks use black rectangles to punch label-sized gaps out of
      // connection paths. Reproduce those gaps natively by painting the page
      // background over the masked rectangles after the connection path.
      if(a.mask&&maskBlackRects.length){
        for(const mr of maskBlackRects)page.drawRectangle({x:(+mr.x-b.x)*scale,y:yPdf(b,+mr.y+(+mr.height)),width:+mr.width*scale,height:+mr.height*scale,color:rgb(1,1,1)});
      }
      arrow(page,b,a);
      continue;
    }
    const o={x:-b.x*scale,y:(b.y+b.h)*scale,scale,color:fill};
    if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawSvgPath(a.d,o);
  }
  for(const m of visibleSvg.matchAll(/<circle\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    const o={x:(+a.cx-b.x)*scale,y:yPdf(b,+a.cy),size:(+a.r)*scale};if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawCircle(o);
  }
  for(const m of visibleSvg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)){
    const a=attrs('<text '+m[1]+'>'),s=style(a),raw=m[2],size=+(a['font-size']||s['font-size']?.replace('px','')||16)*scale;
    const font=(a.class||'').includes('text-bold')?bold:(a.class||'').includes('text-italic')?italic:regular,anchor=a['text-anchor']||s['text-anchor'],color=hex(a.fill||s.fill)||rgb(0,0,0);
    const spans=[...raw.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    const lines=spans.length?spans.map(t=>{const ta=attrs('<tspan '+t[1]+'>');return{x:+(ta.x??a.x),dy:+(ta.dy||0),text:pdfText(decode(t[2].replace(/<[^>]+>/g,'')).trim())};}):[{x:+a.x,dy:0,text:pdfText(decode(raw.replace(/<[^>]+>/g,'')).trim())}];
    let yy=+a.y;for(const line of lines){yy+=line.dy; if(!line.text)continue;let x=(line.x-b.x)*scale,w=font.widthOfTextAtSize(line.text,size);if(anchor==='middle')x-=w/2;else if(anchor==='end')x-=w;page.drawText(line.text,{x,y:yPdf(b,yy)-size*.22,size,font,color});}
  }

  // Final paint order: connections first, then boxes, circles and text.
  // This preserves the visually verified D2 layering in the native PDF.
  // Deployment connections run inside enclosing Host/Program boxes. Repainting
  // those filled containers after the paths hides the connections completely.
  // The initial rectangle pass already established the Deployment box geometry,
  // so preserve its subsequently drawn connection paths instead of covering them.
  for(const o of name==='deployment'?[]:(page.__boxes||[])){
    if(!o.dash?.length){page.drawRectangle(o);continue;}
    page.drawRectangle({x:o.x,y:o.y,width:o.width,height:o.height,color:o.color,opacity:o.opacity});
    const dashLength=o.dash[0]*scale;
    const gapLength=(o.dash[1]??o.dash[0])*scale;
    if(!(dashLength>0)||!(gapLength>0)){page.drawRectangle({...o,dash:undefined});continue;}
    const drawDashed=(x1,y1,x2,y2)=>{
      const horizontal=y1===y2,length=horizontal?Math.abs(x2-x1):Math.abs(y2-y1);
      const sign=horizontal?Math.sign(x2-x1):Math.sign(y2-y1);
      for(let p=0;p<length;p+=dashLength+gapLength){
        const q=Math.min(p+dashLength,length);
        page.drawLine({start:{x:x1+(horizontal?sign*p:0),y:y1+(horizontal?0:sign*p)},end:{x:x1+(horizontal?sign*q:0),y:y1+(horizontal?0:sign*q)},color:o.borderColor,thickness:o.borderWidth});
      }
    };
    drawDashed(o.x,o.y,o.x+o.width,o.y);
    drawDashed(o.x+o.width,o.y,o.x+o.width,o.y+o.height);
    drawDashed(o.x+o.width,o.y+o.height,o.x,o.y+o.height);
    drawDashed(o.x,o.y+o.height,o.x,o.y);
  }
  // Redraw circles after restored box fills so requirement and Pulse circles
  // remain visible above boxes and continue to mask connector lines.
  for(const m of visibleSvg.matchAll(/<circle\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    const o={x:(+a.cx-b.x)*scale,y:yPdf(b,+a.cy),size:(+a.r)*scale};if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawCircle(o);
  }
  for(const m of visibleSvg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)){
    const a=attrs('<text '+m[1]+'>'),s=style(a),raw=m[2],size=+(a['font-size']||s['font-size']?.replace('px','')||16)*scale;
    const font=(a.class||'').includes('text-bold')?bold:(a.class||'').includes('text-italic')?italic:regular,anchor=a['text-anchor']||s['text-anchor'],color=hex(a.fill||s.fill)||rgb(0,0,0);
    const spans=[...raw.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    const lines=spans.length?spans.map(t=>{const ta=attrs('<tspan '+t[1]+'>');return{x:+(ta.x??a.x),dy:+(ta.dy||0),text:pdfText(decode(t[2].replace(/<[^>]+>/g,'')).trim())};}):[{x:+a.x,dy:0,text:pdfText(decode(raw.replace(/<[^>]+>/g,'')).trim())}];
    let yy=+a.y;for(const line of lines){yy+=line.dy;let x=(line.x-b.x)*scale,y=yPdf(b,yy),w=font.widthOfTextAtSize(line.text,size);if(anchor==='middle')x-=w/2;else if(anchor==='end')x-=w;page.drawText(line.text,{x,y:yPdf(b,yy)-size*.22,size,font,color});}
  }


  // Paint PDF-owned requirement markers over the SVG r badges. The SVG badge
  // remains the stable geometry/click anchor; the visible PDF symbol is a
  // deterministic yellow note-like marker at exactly the same center.
  for(const m of svg.matchAll(/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\S]*?)<\/g>/g)){
    const circle=m[2].match(/<circle\b[^>]*>/); if(!circle)continue;
    const ca=attrs(circle[0]),x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale;
    page.drawRectangle({x:x-r,y:y-r,width:2*r,height:2*r,color:rgb(1,193/255,7/255),borderColor:rgb(71/255,85/255,105/255),borderWidth:.75});
  }

  const re=/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\S]*?)<\/g>/g;
  const annotationRefs=[];
  for(const m of svg.matchAll(re)){
    const ga=attrs('<g '+m[1]+'>'),circle=m[2].match(/<circle\b[^>]*>/);if(!circle)continue;const ca=attrs(circle[0]);
    const x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale,key=decode(ga['data-key']||''),label=decode(ga['data-label']||key);
    const reqs=data.requirements[key];
    if(!Array.isArray(reqs)||!reqs.length)throw Error('Requirement badge has no requirements: '+key);
    const rect=(name==='ui' && /^(ui\.(?:action|info|subview-action|subview-info)\.)/.test(key))
      ? [x-r,y-r,x+r,y+r]
      : [x-10,y+r,x+10,y+r+20];
    const annot=doc.context.obj({
      Type:PDFName.of('Annot'),
      Subtype:PDFName.of('Text'),
      Rect:rect,
      Contents:PDFHexString.fromText(reqs.join('\n\n')),
      T:PDFHexString.fromText(label),
      Name:PDFName.of('Comment'),
      Open:false,
      // Hidden keeps the reader-owned Text-annotation icon out of the visual
      // language. The CPU-rendered marker remains the sole visible indicator.
      F:2,
    });
    annotationRefs.push(doc.context.register(annot));
  }
  if(annotationRefs.length)page.node.set(PDFName.of('Annots'),doc.context.obj(annotationRefs));
  const legendMatch=svg.match(/<g\b[^>]*data-requirement-legend="true"[^>]*>([\s\S]*?)<\/g>/);
  if(legendMatch){
    const circle=legendMatch[1].match(/<circle\b[^>]*>/);
    if(!circle)throw Error('Requirement legend has no annotation anchor');
    const ca=attrs(circle[0]),x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale;
    addAnnot(page,doc,{
      Type:PDFName.of('Annot'),
      Subtype:PDFName.of('Text'),
      Rect:[x-r,y-r,x+r,y+r],
      Contents:PDFHexString.fromText('Directly attached requirements'),
      T:PDFHexString.fromText('Requirements'),
      Name:PDFName.of('Comment'),
      Open:false,
      F:2,
    });
  }
  const pdfPath=path.join(out,`${name}.pdf`);
  fs.writeFileSync(pdfPath,await doc.save({useObjectStreams:false}));
  console.log('Native PDF diagram ready:',pdfPath);
}
