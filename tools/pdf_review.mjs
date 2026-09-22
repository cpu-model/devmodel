#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument, PDFName, PDFString, StandardFonts, rgb} from 'pdf-lib';

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
  const re=/<g\b([^>]*data-requirement-badge="true"[^>]*)>([\s\S]*?)<\/g>/g;
  for(const m of svg.matchAll(re)){
    const key=m[1].match(/data-key="([^"]+)"/)?.[1];
    const label=m[1].match(/data-label="([^"]+)"/)?.[1];
    const c=m[2].match(/<circle\b[^>]*\bcx="([^"]+)"[^>]*\bcy="([^"]+)"[^>]*\br="([^"]+)"/);
    if(!key||!label||!c) throw new Error('Malformed requirement badge');
    out.push({key:decode(key),label:decode(label),x:+c[1],y:+c[2],r:+c[3]});
  }
  return out;
}
function convertSvg(svgPath,pdfPath,width,height){
  // CSS px are 96/in while PDF points are 72/in. Chromium therefore emits
  // a page at 0.75 of the SVG viewBox dimensions; annotations are mapped
  // against the imported page dimensions below.
  const html=path.join(out,'.pdf-source.html');
  const src='file://'+svgPath;
  fs.writeFileSync(html,'<!doctype html><style>@page{size:'+width+'px '+height+'px;margin:0}html,body{margin:0;width:'+width+'px;height:'+height+'px;overflow:hidden}img{display:block;width:'+width+'px;height:'+height+'px}</style><img src="'+src+'">');
  const r=spawnSync(browser,['--headless','--disable-gpu','--no-sandbox','--print-to-pdf-no-header','--print-to-pdf='+pdfPath,html],{encoding:'utf8'});
  fs.rmSync(html,{force:true});
  if(r.status!==0||!fs.existsSync(pdfPath)) throw new Error('Browser SVG-to-PDF conversion failed: '+(r.stderr||r.stdout));
}
function addAnnot(page,doc,obj){
  let annots=page.node.lookup(PDFName.of('Annots'));
  if(!annots){annots=doc.context.obj([]);page.node.set(PDFName.of('Annots'),annots);}
  annots.push(doc.context.register(doc.context.obj(obj)));
}
function wrap(font,text,size,max){
  text=winAnsiText(text);
  const words=text.split(/\s+/); const lines=[]; let line='';
  for(const word of words){const n=line?line+' '+word:word;if(font.widthOfTextAtSize(n,size)>max&&line){lines.push(line);line=word}else line=n}
  if(line)lines.push(line); return lines;
}

const doc=await PDFDocument.create();
const normal=await doc.embedFont(StandardFonts.Helvetica);
const bold=await doc.embedFont(StandardFonts.HelveticaBold);
function winAnsiText(text){
  // Visible requirement pages are a navigation fallback. Preserve exact
  // Unicode requirement text in the Text annotation; replace only glyphs
  // unavailable in PDF's built-in WinAnsi font for visible fallback text.
  return text.replaceAll('\u2212','-').replaceAll('\u2011','-').replaceAll('\u2013','-').replaceAll('\u2014','-');
}
const diagrams=[];

for(const name of names){
  const svgPath=path.join(out,name+'.svg');
  const svg=fs.readFileSync(svgPath,'utf8');
  const box=viewBox(svg);
  const temp=path.join(out,'.'+name+'.pdf');
  convertSvg(svgPath,temp,box.width,box.height);
  const src=await PDFDocument.load(fs.readFileSync(temp)); fs.rmSync(temp,{force:true});
  const [embedded]=await doc.embedPdf(src,[0]);
  const page=doc.addPage([embedded.width,embedded.height]);
  page.drawPage(embedded,{x:0,y:0,width:embedded.width,height:embedded.height});
  diagrams.push({name,page,box,badges:badges(svg)});
}

const reqPages=new Map();
for(const d of diagrams) for(const b of d.badges){
  if(reqPages.has(b.key))continue;
  const reqs=data.requirements[b.key];
  const page=doc.addPage([595.28,841.89]); reqPages.set(b.key,page);
  page.drawText(b.label,{x:54,y:785,size:18,font:bold});
  page.drawText(b.key,{x:54,y:762,size:9,font:normal,color:rgb(.25,.3,.4)});
  const back='Tillbaka till diagrammet';
  page.drawText(back,{x:54,y:730,size:10,font:bold,color:rgb(.05,.2,.7)});
  let y=694;
  reqs.forEach((req,i)=>{for(const line of wrap(normal,(i+1)+'. '+req,11,487)){page.drawText(line,{x:54,y,size:11,font:normal});y-=16}y-=10});
  y-=6; page.drawText(back,{x:54,y,size:10,font:bold,color:rgb(.05,.2,.7)});
  page._cpuBackY=y;
}

for(const d of diagrams) for(const b of d.badges){
  const sx=d.page.getWidth()/d.box.width, sy=d.page.getHeight()/d.box.height;
  const x=(b.x-d.box.x)*sx, y=d.page.getHeight()-(b.y-d.box.y)*sy, r=b.r*Math.min(sx,sy);
  addAnnot(d.page,doc,{Type:'Annot',Subtype:'Text',Rect:[x+.5*r,y+.866*r,x+.5*r+8,y+.866*r+8],Contents:PDFString.of(data.requirements[b.key].join('\n\n')),T:PDFString.of(b.label),Name:'Comment',Open:false,F:4});
  addAnnot(d.page,doc,{Type:'Annot',Subtype:'Link',Rect:[x-r-2,y-r-2,x+r+2,y+r+2],Border:[0,0,0],Dest:[reqPages.get(b.key).ref,'Fit']});
}
for(const [key,page] of reqPages){
  const diagram=diagrams.find(d=>d.badges.some(b=>b.key===key)).page;
  addAnnot(page,doc,{Type:'Annot',Subtype:'Link',Rect:[52,722,200,744],Border:[0,0,0],Dest:[diagram.ref,'Fit']});
  addAnnot(page,doc,{Type:'Annot',Subtype:'Link',Rect:[52,page._cpuBackY-4,200,page._cpuBackY+14],Border:[0,0,0],Dest:[diagram.ref,'Fit']});
  delete page._cpuBackY;
}
fs.writeFileSync(path.join(out,'review.pdf'),await doc.save({useObjectStreams:false}));
console.log('Permanent PDF review ready:',path.join(out,'review.pdf'));
