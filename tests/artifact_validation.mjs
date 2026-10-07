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
      path.join(root, 'tools', 'validate_native_model.mjs'), '--source', directory,
    ], {encoding: 'utf8'});
    assert.notEqual(result.status, 0, `Expected ${filename} validation to fail`);
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

invalidModel('context.yaml', document => { document.context.system.name = ' '; }, /context\.system\.name must be a non-empty string/);
invalidModel('pulse.yaml', document => { document.pulse.behaviors[0].name = ''; }, /pulse\.behaviors\[0\]\.name must be a non-empty string/);
invalidModel('ui.yaml', document => { document.ui.views[0].actions[0].name = ''; }, /ui\.view\.main\.actions\[0\]\.name must be a non-empty string/);
invalidModel('ui.yaml', document => { document.ui.subviews[1].actions[0].name = ''; }, /ui\.subview\.shared-status\.actions\[0\]\.name must be a non-empty string/);
invalidModel('requirements.yaml', document => { document.requirements['ui.view.main'] = []; }, /must not be empty/);
invalidModel('requirements.yaml', document => { document.requirements['ui.view.main'] = ['legacy string']; }, /must be a mapping/);
invalidModel('requirements.yaml', document => { document.requirements['ui.view.main'] = [{id: 'bad', text: 'Rule', status: 'new'}]; }, /unknown \[status\]/);
invalidModel('requirements.yaml', document => {
  document.requirements['ui.view.main'] = [{id: 'submit-input', text: 'Another rule'}];
}, /Duplicate requirement ID: submit-input/);
invalidModel('requirements.yaml', document => { document.requirements['pulse.capability.input-handling'] = [{id: 'capability-rule', text: 'Invalid'}]; }, /Unknown Pulse requirement target/);
invalidModel('pulse.yaml', document => { delete document.pulse.behaviors[0].capability; }, /missing \[capability\]/);
invalidModel('pulse.yaml', document => { document.pulse.behaviors[0].capability = 'missing'; }, /Unknown Capability for Behavior/);
invalidModel('pulse.yaml', document => { document.pulse.capabilities.push({...document.pulse.capabilities[0]}); }, /Duplicate Capability ID/);
invalidModel('pulse.yaml', document => { document.pulse.capabilities[0].owner = 'team'; }, /unknown \[owner\]/);
invalidModel('pulse.yaml', document => { document.pulse['domain-information'][0].schema = 'string'; }, /unknown \[schema\]/);
invalidModel('pulse.yaml', document => { document.pulse['domain-information'].push({id: 'unused', name: 'Unused'}); }, /Unreferenced Domain Information/);
invalidModel('pulse.yaml', document => { document.pulse.behaviors[0]['information-in'] = ['missing']; }, /Unknown Domain Information reference/);
invalidModel('pulse.yaml', document => { document.pulse.behaviors[0]['information-in'] = ['submitted-input', 'submitted-input']; }, /Duplicate Domain Information reference/);
invalidModel('pulse.yaml', document => {
  delete document.pulse.capabilities;
  delete document.pulse['capability-flows'];
}, /Behavior capability is forbidden/);
invalidModel('pulse.yaml', document => {
  delete document.pulse.capabilities;
}, /pulse\.capability-flows is forbidden when pulse\.capabilities is absent/);
invalidModel('pulse.yaml', document => {
  document.pulse['capability-flows'][0].capabilities = ['input-handling'];
}, /Capability Flow requires at least two Capabilities/);
invalidModel('pulse.yaml', document => {
  document.pulse['capability-flows'][0].capabilities = ['input-handling', 'missing'];
}, /Unknown Capability in Capability Flow/);
invalidModel('pulse.yaml', document => {
  document.pulse['capability-flows'][0].capabilities = ['result-presentation', 'input-handling'];
}, /Unsupported Capability Flow transition/);
invalidModel('deployment.yaml', document => {
  document.deployment.programs[0]['health-check'].command = 'unexpected';
}, /command is not allowed for HTTP/);
invalidModel('deployment.yaml', document => { document.deployment.programs[0].resources = {}; }, /resources requires cpu or memory/);

console.log('Validated strict field rules across all CPU model sources.');
