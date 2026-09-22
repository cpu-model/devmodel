#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFName, PDFHexString, StandardFonts, rgb } from 'pdf-lib';

const out=path.resolve(process.argv[2]||'output/model');
fs.mkdirSync(out,{recursive:true});
const doc=await PDFDocument.create();
const page=doc.addPage([420,220]);
const font=await doc.embedFont(StandardFonts.Helvetica);
page.drawText('Minimal native PDF annotation test',{x:40,y:170,size:18,font});
page.drawText('Click the r / note icon. Expected popup text: POPUP TEST OK',{x:40,y:145,size:11,font});
page.drawCircle({x:90,y:90,size:12,borderColor:rgb(.2,.25,.35),borderWidth:1.5});
page.drawText('r',{x:87,y:85,size:12,font,color:rgb(.2,.25,.35)});

const annot=doc.context.obj({
  Type: PDFName.of('Annot'),
  Subtype: PDFName.of('Text'),
  Rect: [102,96,122,116],
  Contents: PDFHexString.fromText('POPUP TEST OK\nSecond line of popup text.'),
  T: PDFHexString.fromText('Requirement test'),
  Name: PDFName.of('Comment'),
  Open: false,
  F: 4,
});
const ref=doc.context.register(annot);
page.node.set(PDFName.of('Annots'),doc.context.obj([ref]));

const target=path.join(out,'annotation-test.pdf');
fs.writeFileSync(target,await doc.save({useObjectStreams:false}));
console.log('Minimal annotation test ready:',target);
