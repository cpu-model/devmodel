import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/pdf_review.mjs',import.meta.url),'utf8');
assert.match(source,/data-requirement-badge="true"/);
assert.match(source,/Subtype:'Text'/);
assert.match(source,/Subtype:'Link'/);
assert.match(source,/Contents:PDFString\.of\(data\.requirements\[b\.key\]\.join\('\\n\\n'\)\)/);
assert.match(source,/x\+\.5\*r,y\+\.866\*r/);
assert.match(source,/Tillbaka till diagrammet/);
assert.match(source,/drawPage\(embedded/);
assert.doesNotMatch(source,/drawCircle|drawLine|drawRectangle/);
console.log('PDF review contract checks passed');
