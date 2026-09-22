import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/pdf_review.mjs',import.meta.url),'utf8');
assert.match(source,/data-requirement-badge="true"/);
assert.match(source,/Subtype:'Text'/);
assert.doesNotMatch(source,/Subtype:'Link'/);
assert.match(source,/Contents:PDFHexString\.fromText\(data\.requirements\[b\.key\]\.join\('\\n\\n'\)\)/);
assert.match(source,/replaceAll\('\\u2212','-'\)/);
assert.match(source,/x\+\.5\*r,y\+\.866\*r/);
assert.doesNotMatch(source,/Tillbaka till diagrammet/);
assert.match(source,/convertSvgs\(diagramSources,basePdf\)/);
assert.match(source,/copyPages\(base,base\.getPageIndices\(\)\)/);
assert.match(source,/base\.getPageCount\(\)!==diagramSources\.length/);
assert.doesNotMatch(source,/drawCircle|drawLine|drawRectangle/);
console.log('PDF review contract checks passed');
