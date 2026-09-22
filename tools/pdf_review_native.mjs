#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument, PDFName, PDFHexString, StandardFonts, rgb} from 'pdf-lib';

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
const box=svg=>{const m=svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);if(!m)throw Error('SVG has no viewBox');const [x,y,w,h]=m[1].split(/\s+/).map(Number);return{x,y,w,h};};
const yPdf=(b,y)=>(b.y+b.h-y)*scale;
function addAnnot(page,doc,obj){let a=page.node.lookup(PDFName.of('Annots'));if(!a){a=doc.context.obj([]);page.node.set(PDFName.of('Annots'),a);}a.push(doc.context.register(doc.context.obj(obj)));}

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
  }
  for(const m of svg.matchAll(/<circle\b[^>]*>/g)){
    const a=attrs(m[0]),s=style(a);const fill=hex(a.fill||s.fill),stroke=hex(a.stroke||s.stroke);
    const o={x:(+a.cx-b.x)*scale,y:yPdf(b,+a.cy),size:(+a.r)*scale};if(fill)o.color=fill;if(stroke){o.borderColor=stroke;o.borderWidth=+(s['stroke-width']||a['stroke-width']||1)*scale;}
    page.drawCircle(o);
  }
  for(const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)){
    const a=attrs('<text '+m[1]+'>'),s=style(a),text=decode(m[2].replace(/<[^>]+>/g,'')).trim();if(!text)continue;
    const size=+(a['font-size']||s['font-size']?.replace('px','')||16)*scale;
    const font=(a.class||'').includes('text-bold')?bold:(a.class||'').includes('text-italic')?italic:regular;
    let x=(+a.x-b.x)*scale; const width=font.widthOfTextAtSize(text,size);
    const anchor=a['text-anchor']||s['text-anchor'];if(anchor==='middle')x-=width/2;else if(anchor==='end')x-=width;
    const y=yPdf(b,+a.y)-size*.22;
    page.drawText(text,{x,y,size,font,color:hex(a.fill||s.fill)||rgb(0,0,0)});
  }

  const re=/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\S]*?)<\/g>/g;
  for(const m of svg.matchAll(re)){
    const ga=attrs('<g '+m[1]+'>'),c=m[2].match(/<circle\b[^>]*>/);if(!c)continue;const ca=attrs(c[0]);
    const x=(+ca.cx-b.x)*scale,y=yPdf(b,+ca.cy),r=(+ca.r)*scale,key=decode(ga['data-key']),label=decode(ga['data-label']);
    addAnnot(page,doc,{Type:'Annot',Subtype:'Text',Rect:[x+.5*r,y+.866*r,x+.5*r+8,y+.866*r+8],Contents:PDFHexString.fromText(data.requirements[key].join('\n\n')),T:PDFHexString.fromText(label),Name:'Comment',Open:false,F:4});
  }
}
fs.writeFileSync(path.join(out,'review-native.pdf'),await doc.save({useObjectStreams:false}));
console.log('Experimental native PDF review ready:',path.join(out,'review-native.pdf'));
