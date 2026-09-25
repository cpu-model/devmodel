import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../tools/finish_model.mjs', import.meta.url), 'utf8');

assert.match(source, /const margin = 20/);
assert.match(source, /if \(name === 'pulse'\)[\s\S]*'PULSES'/);
assert.match(source, /for \(const pulse of model\.pulses\)/);
assert.match(source, /textNode\.setAttribute\('text-anchor', 'start'\)/);
assert.match(source, /paths\[index\]\.removeAttribute\('mask'\)/);
assert.match(source, /Cannot establish Deployment label clearance/);
assert.match(source, /data-requirement-legend/);
assert.match(source, /directly attached requirements/);
assert.doesNotMatch(source, /= directly attached requirements/);
assert.doesNotMatch(source, /r in a circle = directly attached requirements/);
assert.doesNotMatch(source, /<div class="legend">/);

console.log('Diagram presentation contract checks passed');
