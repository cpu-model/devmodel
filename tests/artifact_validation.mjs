import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const {parse, stringify} = createRequire(import.meta.url)('yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'examples', 'model');
const files = ['context.yaml', 'pulse.yaml', 'ui.yaml', 'deployment.yaml', 'requirements.yaml'];

function invalidModel(filename, change, expected) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-artifact-invalid-'));
  try {
    for (const file of files) fs.copyFileSync(path.join(example, file), path.join(directory, file));
    const target = path.join(directory, filename);
    const document = parse(fs.readFileSync(target, 'utf8'));
    change(document);
    fs.writeFileSync(target, stringify(document));
    const result = spawnSync(process.execPath, [
      path.join(root, 'tools', 'render_model.mjs'), '--source', directory, '--validate-only',
    ], {encoding: 'utf8'});
    assert.notEqual(result.status, 0, `Expected ${filename} validation to fail`);
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

invalidModel('context.yaml', document => { document.context.system.name = ' '; }, /context\.system\.name must be a non-empty string/);
invalidModel('pulse.yaml', document => { document.pulse.behaviors[0].name = ''; }, /pulse\.behavior\.process-input\.name must be a non-empty string/);
invalidModel('ui.yaml', document => { document.ui.views[0].actions[0].name = ''; }, /ui\.view\.main\.actions\.submit-input\.name must be a non-empty string/);
invalidModel('ui.yaml', document => { document.ui.subviews[1].actions[0].name = ''; }, /ui\.subview\.shared-status\.actions\.refresh-status\.name must be a non-empty string/);
invalidModel('requirements.yaml', document => { document.requirements['ui.view.main'] = []; }, /must have a non-empty list/);
invalidModel('deployment.yaml', document => {
  document.deployment.programs[0]['health-check'].command = 'unexpected';
}, /command is not allowed for HTTP/);
invalidModel('deployment.yaml', document => { document.deployment.programs[0].resources = {}; }, /resources requires cpu or memory/);

console.log('Validated strict field rules across all CPU model sources.');
