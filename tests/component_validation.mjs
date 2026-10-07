import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {baseModelDigest} from '../tools/native/base_model_digest.mjs';

const {parse, stringify} = createRequire(import.meta.url)('yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'examples', 'model');
const baseFiles = ['context.yaml', 'pulse.yaml', 'ui.yaml', 'deployment.yaml', 'requirements.yaml'];
const componentFile = 'components.yaml';

function copyModel(includeComponents = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-components-'));
  for (const file of baseFiles) fs.copyFileSync(path.join(example, file), path.join(directory, file));
  if (includeComponents) fs.copyFileSync(path.join(example, componentFile), path.join(directory, componentFile));
  return directory;
}

function validate(directory) {
  return spawnSync(process.execPath, [
    path.join(root, 'tools', 'validate_native_model.mjs'), '--source', directory,
  ], {encoding: 'utf8'});
}

function validWithoutComponents() {
  const directory = copyModel(false);
  try {
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /Components/);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

function invalidComponent(change, expected) {
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    change(document, directory);
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.notEqual(result.status, 0, 'Expected Component validation to fail');
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

validWithoutComponents();

const validResult = validate(example);
assert.equal(validResult.status, 0, validResult.stderr);
assert.match(validResult.stdout, /2 Components/);
const digestResult = spawnSync(process.execPath, [path.join(root, 'tools', 'model_digest.mjs'), '--source', example], {encoding: 'utf8'});
assert.equal(digestResult.status, 0, digestResult.stderr);
assert.equal(digestResult.stdout.trim(), baseModelDigest(example), 'CLI and validator digest implementation must agree');

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    delete document.components.components[1].reconciliation;
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    document.components.components.push({
      id: 'required-reconciliation-only',
      name: 'Required Reconciliation-only Component',
      responsibility: 'Provide a reviewed prerequisite responsibility without assigned Behaviors.',
      behaviors: [],
    });
    document.components.components[1].reconciliation.requires.push('required-reconciliation-only');
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    document.components.components.push({
      id: 'reconciliation-only',
      name: 'Reconciliation-only Component',
      responsibility: 'Provide a reviewed reconciliation responsibility without assigned Behaviors.',
      behaviors: [],
      reconciliation: {requires: ['result-processing']},
    });
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    document.components.components.push({
      id: 'state-authority',
      name: 'State Authority',
      responsibility: 'Own a structurally declared information authority.',
      behaviors: [],
    });
    document.components['domain-information'][1] = {id: 'processed-result', authority: 'state-authority'};
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    const document = parse(fs.readFileSync(filename, 'utf8'));
    document.components.components.push({
      id: 'requirement-grounded-boundary',
      name: 'Requirement-grounded Boundary',
      responsibility: 'Demonstrate structural grounding by requirement evidence.',
      behaviors: [],
      'requirement-evidence': ['preserve-result-meaning'],
    });
    fs.writeFileSync(filename, stringify(document));
    const result = validate(directory);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const before = baseModelDigest(directory);
    const pulseFilename = path.join(directory, 'pulse.yaml');
    let source = fs.readFileSync(pulseFilename, 'utf8');
    source = source.replace('name: Submitted input', 'name: "Submitted input"');
    fs.writeFileSync(pulseFilename, `\n${source}\n# formatting-only comment\n`);
    assert.equal(baseModelDigest(directory), before, 'Whitespace, quoting, and comments must not affect the base-model digest');

    const document = parse(fs.readFileSync(pulseFilename, 'utf8'));
    document.pulse = Object.fromEntries(Object.entries(document.pulse).reverse());
    fs.writeFileSync(pulseFilename, stringify(document));
    assert.equal(baseModelDigest(directory), before, 'Mapping-key order must not affect the base-model digest');

    fs.appendFileSync(path.join(directory, componentFile), '\n# Component content is excluded\n');
    assert.equal(baseModelDigest(directory), before, 'components.yaml must not affect the base-model digest');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const before = baseModelDigest(directory);
    const pulseFilename = path.join(directory, 'pulse.yaml');
    const document = parse(fs.readFileSync(pulseFilename, 'utf8'));
    document.pulse.behaviors[0].name = 'Changed scalar value';
    fs.writeFileSync(pulseFilename, stringify(document));
    assert.notEqual(baseModelDigest(directory), before, 'Scalar values must affect the base-model digest');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const before = baseModelDigest(directory);
    const pulseFilename = path.join(directory, 'pulse.yaml');
    const document = parse(fs.readFileSync(pulseFilename, 'utf8'));
    document.pulse.behaviors.reverse();
    fs.writeFileSync(pulseFilename, stringify(document));
    assert.notEqual(baseModelDigest(directory), before, 'List order must affect the base-model digest');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

{
  const directory = copyModel();
  try {
    const before = baseModelDigest(directory);
    const requirementsFilename = path.join(directory, 'requirements.yaml');
    const document = parse(fs.readFileSync(requirementsFilename, 'utf8'));
    document.requirements['pulse.behavior.process-input'].push({
      id: 'additional-processing-rule',
      text: 'Additional semantic requirement.',
    });
    fs.writeFileSync(requirementsFilename, stringify(document));
    assert.notEqual(baseModelDigest(directory), before, 'Semantic additions must affect the base-model digest');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

invalidComponent(document => {
  document.components.components.push({
    id: 'duplicate-assignment',
    name: 'Duplicate Assignment',
    responsibility: 'Invalidly duplicates an assignment.',
    behaviors: ['present-result'],
  });
}, /Duplicate Component assignment for Pulse Behavior: present-result/);

invalidComponent(document => {
  document.components.components[0].behaviors.pop();
}, /Missing Component assignment for Pulse Behavior: process-input/);

invalidComponent(document => {
  document.components.components[0].behaviors[0] = 'unknown-behavior';
}, /Unknown Pulse Behavior/);

invalidComponent(document => {
  document.components['domain-information'].push({...document.components['domain-information'][0]});
}, /Duplicate Domain Information mapping: submitted-input/);

invalidComponent(document => {
  document.components['domain-information'].pop();
}, /Missing Domain Information mapping: processed-result/);

invalidComponent(document => {
  document.components['domain-information'][0].id = 'unknown-information';
}, /Unknown Domain Information/);

invalidComponent(document => {
  document.components['domain-information'][0].authority = 'input-processing';
}, /requires authority XOR disposition/);

invalidComponent(document => {
  document.components['domain-information'][0] = {id: 'submitted-input', authority: 'missing-component'};
}, /Unknown Component authority/);

invalidComponent(document => {
  document.components['domain-information'][0].disposition = 'observation';
}, /Invalid Domain Information disposition/);

invalidComponent(document => {
  document.components.components[0]['requirement-evidence'] = ['missing-requirement'];
}, /Unknown requirement evidence/);

invalidComponent(document => {
  document.components.components[0]['requirement-evidence'] = ['process-submitted-input', 'process-submitted-input'];
}, /Duplicate reference.*requirement-evidence/);

invalidComponent(document => {
  document.components.components.push({...document.components.components[0], behaviors: []});
}, /Duplicate Component ID/);

invalidComponent(document => {
  document.components.components = [];
}, /components\.components must not be empty/);

invalidComponent(document => {
  document.components.components[0].implementation = 'package';
}, /unknown \[implementation\]/);

invalidComponent(document => {
  document.components.components[0]['source-files'] = ['internal/result.go'];
}, /unknown \[source-files\]/);

invalidComponent(document => {
  document.components.components[1].reconciliation.mode = 'startup';
}, /reconciliation: unknown \[mode\]/);

invalidComponent(document => {
  document.components.components[1].reconciliation.requires = ['missing-component'];
}, /Unknown Component reconciliation prerequisite: missing-component/);

invalidComponent(document => {
  document.components.components[1].reconciliation.requires = ['result-processing', 'result-processing'];
}, /Duplicate reference.*reconciliation\.requires/);

invalidComponent(document => {
  document.components.components[1].reconciliation.requires = ['result-presentation'];
}, /Component reconciliation self dependency: result-presentation/);

invalidComponent(document => {
  document.components.components[0].reconciliation = {requires: ['result-presentation']};
}, /Component reconciliation cycle/);

invalidComponent(document => {
  document.components.components.push({
    id: 'indirect-cycle', name: 'Indirect Cycle', responsibility: 'Invalid cycle participant.', behaviors: [],
    reconciliation: {requires: ['result-presentation']},
  });
  document.components.components[0].reconciliation = {requires: ['indirect-cycle']};
}, /Component reconciliation cycle/);

invalidComponent((document, directory) => {
  const pulseFilename = path.join(directory, 'pulse.yaml');
  const pulse = parse(fs.readFileSync(pulseFilename, 'utf8'));
  pulse.pulse.behaviors[0].name = 'Semantically changed name';
  fs.writeFileSync(pulseFilename, stringify(pulse));
}, /components.yaml is stale/);

invalidComponent(document => {
  document.components.components.push({
    id: 'ungrounded',
    name: 'Ungrounded',
    responsibility: 'Has no structural grounding.',
    behaviors: [],
  });
}, /Component lacks structural grounding/);

invalidComponent(document => {
  document.components['domain-information'][1] = {id: 'processed-result', disposition: 'derived'};
  document.components.components.push({
    id: 'derived-only-estimator',
    name: 'Derived-only Estimator',
    responsibility: 'Claims estimation responsibility without explicit model grounding.',
    behaviors: [],
  });
}, /Component lacks structural grounding: derived-only-estimator/);

{
  const directory = copyModel();
  try {
    const filename = path.join(directory, componentFile);
    fs.appendFileSync(filename, '\ncomponents: {}\n');
    const result = validate(directory);
    assert.notEqual(result.status, 0, 'Expected duplicate YAML key to fail');
    assert.match(result.stderr, /Map keys must be unique/);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

console.log('Validated optional Component architecture and strict rejection cases.');
