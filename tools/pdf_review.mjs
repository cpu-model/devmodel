#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument, PDFName, PDFHexString} from 'pdf-lib';

const out = path.resolve(process.argv[2] || 'output/model');
const browser = process.env.CPU_REVIEW_BROWSER;
if (!browser) throw new Error('CPU_REVIEW_BROWSER is required for PDF review generation');
const data = JSON.parse(fs.readFileSync(path.join(out, 'model.json'), 'utf8'));
const names = ['context','pulse','ui','deployment'];

function viewBox(svg) {
  const m = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
  if (!m) throw new Error('Finished SVG has no outer viewBox');
  const [x,y,width,height] = m[1].trim().split(/\s+/).map(Number);
  return {x,y,width,height};
}
function decode(s){return s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>');}
function badges(svg) {
  const out=[];
  const re=/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\\S]*?)<\\/g>/g;
  for(const m of svg.matchAll(re)){
    const key=m[1].match(/data-key="([^"]+)"/)?.[1];
    const label=m[1].match(/data-label="([^"]+)"/)?.[1];
    const c=m[2].match(/<circle\b[^>]*\bcx="([^"]+)"[^>]*\bcy="([^"]+)"[^>]*\br="([^"]+)"/);
    if(!key||!label||!c) throw new Error('Malformed requirement badge');
    out.push({key:decode(key),label:decode(label),x:+c[1],y:+c[2],r:+c[3]});
  }
  return out;
}
function convertSvgs(items,pdfPath){
  const html=path.join(out,'.pdf-source.html');
  const width=Math.max(...items.map(i=>i.box.width));
  const height=Math.max(...items.map(i=>i.box.height));
  const pages=items.map(i=>'<section class="page"><img src="file://'+i.svgPath+'" style="width:'+i.box.width+'px;height:'+i.box.height+'px"></section>').join('');
  fs.writeFileSync(html,'<!doctype html><style>@page{size:'+width+'px '+height+'px;margin:0}html,body{margin:0}.page{width:'+width+'px;height:'+height+'px;page-break-after:always;display:flex;align-items:flex-start;justify-content:flex-start;overflow:hidden}.page:last-child{page-break-after:auto}img{display:block}</style>'+pages);
  const r=spawnSync(browser,['--headless','--disable-gpu','--no-sandbox','--print-to-pdf-no-header','--print-to-pdf='+pdfPath,html],{encoding:'utf8'});
  fs.rmSync(html,{force:true});
  if(r.status!==0||!fs.existsSync(pdfPath)) throw new Error('Browser SVG-to-PDF conversion failed: '+(r.stderr||r.stdout));
}
function addAnnot(page,doc,obj){
  let annots=page.node.lookup(PDFName.of('Annots'));
  if(!annots){annots=doc.context.obj([]);page.node.set(PDFName.of('Annots'),annots);}
  annots.push(doc.context.register(doc.context.obj(obj)));
}

const doc=await PDFDocument.create();
const diagramSources=names.map(name=>{
  const svgPath=path.join(out,name+'.svg');
  const svg=fs.readFileSync(svgPath,'utf8');
  return {name,svgPath,svg,box:viewBox(svg),badges:badges(svg)};
});
const basePdf=path.join(out,'.diagrams.pdf');
convertSvgs(diagramSources,basePdf);
const base=await PDFDocument.load(fs.readFileSync(basePdf));
fs.rmSync(basePdf,{force:true});
if(base.getPageCount()!==diagramSources.length) throw new Error('Browser PDF page count does not match diagram count');
const copied=await doc.copyPages(base,base.getPageIndices());
const diagrams=diagramSources.map((d,i)=>{
  const page=copied[i];
  doc.addPage(page);
  return {...d,page};
});

for(const d of diagrams) for(const b of d.badges){
  const sx=d.page.getWidth()/d.box.width, sy=d.page.getHeight()/d.box.height;
  const x=(b.x-d.box.x)*sx, y=d.page.getHeight()-(b.y-d.box.y)*sy, r=b.r*Math.min(sx,sy);
  addAnnot(d.page,doc,{Type:'Annot',Subtype:'Text',Rect:[x+.5*r,y+.866*r,x+.5*r+8,y+.866*r+8],Contents:PDFHexString.fromText(data.requirements[b.key].join('\n\n')),T:PDFHexString.fromText(b.label),Name:'Comment',Open:false,F:4});
}

fs.writeFileSync(path.join(out,'review.pdf'),await doc.save());
console.log('Permanent PDF review ready:',path.join(out,'review.pdf'));
