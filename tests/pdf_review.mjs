import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const name of ['context', 'pulse', 'ui', 'deployment']) {
  const source = fs.readFileSync(new URL(`../tools/native/${name}_pdf.mjs`, import.meta.url), 'utf8');
  assert.match(source, /Subtype: PDFName\.of\('Text'\)/);
  assert.match(source, /Name: PDFName\.of\('Comment'\)/);
  assert.match(source, /AP: \{N: appearanceRef\}/);
  assert.match(source, /Subtype: PDFName\.of\('Popup'\)/);
  assert.match(source, /Open: PDFBool\.False/);
  assert.match(source, /Contents: PDFHexString\.fromText\(contents\.join\('\\n\\n'\)\)/);
  assert.doesNotMatch(source, /Subtype: PDFName\.of\('Link'\)/);
  assert.doesNotMatch(source, /<svg|\.svg\b|D2|ELK/);
}
console.log('Native PDF annotation contract checks passed');
