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
assert.match(validResult.stdout, /3 Components/);

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

invalidComponent(document => {
  document.components.components.push({
    id: 'unmotivated-infrastructure',
    name: 'Unmotivated Infrastructure',
    responsibility: 'Claim a technical boundary without normative realization evidence.',
    kind: 'infrastructure',
    behaviors: [],
    'requirement-evidence': ['preserve-result-meaning'],
  });
}, /Infrastructure Component requires Deployment requirement evidence: unmotivated-infrastructure/);

invalidComponent(document => {
  document.components.components[0].kind = 'technical';
}, /Invalid Component responsibility kind: technical/);

// Realization reconciliation is semantic review rather than components.yaml
// structure, so these executable closure cases encode its normative PASS gate.
function realizationReconciliationPass(artifacts) {
  return artifacts.length > 0 && artifacts.every(artifact =>
    artifact.inScope
    && artifact.owner
    && artifact.ownerVerified === true
    && artifact.mixed !== true
    && artifact.unresolved !== true);
}

assert.equal(realizationReconciliationPass([
  {path: 'store.sql', inScope: true, owner: '', ownerVerified: false},
]), false, 'An unowned system artifact must block reconciliation PASS');

assert.equal(realizationReconciliationPass([
  {path: 'service.go', inScope: true, owner: 'runtime-composition', ownerVerified: false, mixed: true},
]), false, 'A mixed artifact with a candidate owner must block reconciliation PASS');

assert.equal(realizationReconciliationPass([
  {
    path: 'service.go', inScope: true, owner: 'runtime-composition', ownerVerified: false,
    mixed: true, unresolved: true, architectureReviewed: true,
  },
]), false, 'Architecture review without resolved verified ownership must block reconciliation PASS');

assert.equal(realizationReconciliationPass([
  {path: 'main.go', inScope: true, owner: 'runtime-composition', ownerVerified: true},
]), true, 'One semantically verified owner may contribute to reconciliation PASS');

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
