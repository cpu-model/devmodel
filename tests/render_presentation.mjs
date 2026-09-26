import assert from 'node:assert/strict';
import fs from 'node:fs';

const context = fs.readFileSync(new URL('../tools/native/context_pdf.mjs', import.meta.url), 'utf8');
const pulse = fs.readFileSync(new URL('../tools/native/pulse_pdf.mjs', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../tools/native/ui_pdf.mjs', import.meta.url), 'utf8');
const deployment = fs.readFileSync(new URL('../tools/native/deployment_pdf.mjs', import.meta.url), 'utf8');

assert.match(context, /flow\.initiative/);
assert.match(context, /labelBox\.x - 18/);
assert.match(pulse, /page\.drawCircle\(\{x: flow\.symbol\.x/);
assert.match(pulse, /page\.drawText\('PULSES'/);
assert.match(ui, /kind: 'action'/);
assert.match(ui, /kind: 'information'/);
assert.match(ui, /dashedRectangle/);
assert.match(deployment, /connection\.label\.y/);
assert.match(deployment, /connection\.label\.x - width \/ 2 - 32/);
assert.match(deployment, /implementationDetail/);

console.log('Native diagram presentation contract checks passed');
