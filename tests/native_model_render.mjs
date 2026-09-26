import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const {PDFDocument, PDFName} = createRequire(import.meta.url)('pdf-lib');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-native-model-'));
const result = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_native_model.mjs'),
  '--source', path.join(root, 'examples', 'model'), '--out', output,
], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
assert.deepEqual(fs.readdirSync(output).sort(), ['context.pdf', 'deployment.pdf', 'pulse.pdf', 'ui.pdf']);
for (const name of ['context', 'pulse', 'ui', 'deployment']) {
  const source = fs.readFileSync(path.join(output, `${name}.pdf`), 'latin1');
  assert.match(source, /%PDF-1\.7/);
  assert.doesNotMatch(source, /<svg|\/Image\b/);
}

const expectedContents = {
  context: ['The system shall accept user input.'],
  pulse: ['The system shall process submitted input.'],
  ui: [
    'The user shall be able to submit input.',
    'Shared status shall be reusable across Views.',
    'The user shall be able to refresh shared status.',
    'Shared current status shall be visible.',
  ],
  deployment: [
    'The application shall run on a Linux host.',
    'The server and Web UI shall be delivered as one operating-system process.',
    'The Web UI shall listen on port 8080.',
    'Persistent application data shall be stored in PostgreSQL.',
    'The application shall connect to PostgreSQL over the internal deployment network.',
  ],
};
for (const [name, expected] of Object.entries(expectedContents)) {
  const document = await PDFDocument.load(fs.readFileSync(path.join(output, `${name}.pdf`)));
  const annotations = document.getPages()[0].node.Annots();
  const contents = [];
  let popups = 0;
  for (const reference of annotations.asArray()) {
    const annotation = document.context.lookup(reference);
    const subtype = annotation.get(PDFName.of('Subtype'))?.toString();
    if (subtype === '/Text') contents.push(annotation.get(PDFName.of('Contents')).decodeText());
    if (subtype === '/Popup') popups += 1;
  }
  assert.deepEqual(contents.sort(), expected.sort(), `${name} requirement annotation contents`);
  assert.equal(popups, expected.length, `${name} popup count`);
}
console.log('Unified native PDF renderer checks passed');
