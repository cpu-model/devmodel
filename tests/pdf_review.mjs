import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/pdf_review_native.mjs',import.meta.url),'utf8');
assert.match(source,/data-requirement-badge="true"/);
assert.match(source,/const visibleSvg=svg\.replace/);
assert.match(source,/Subtype:PDFName\.of\('Text'\)/);
assert.doesNotMatch(source,/Subtype:PDFName\.of\('Link'\)/);
assert.match(source,/Contents:PDFHexString\.fromText\(reqs\.join\('\\n\\n'\)\)/);
assert.match(source,/x\+\.5\*r,y\+\.866\*r/);
assert.doesNotMatch(source,/Tillbaka till diagrammet/);
assert.match(source,/review\.pdf/);
assert.match(source,/page\.drawLine/);
assert.match(source,/page\.drawCircle/);
assert.match(source,/page\.drawRectangle/);
assert.doesNotMatch(source,/review-native\.pdf/);
console.log('Native PDF review contract checks passed');
