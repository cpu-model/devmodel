import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'validate_implementation_task.mjs');
const model = path.join(root, 'examples', 'model');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-task-contract-'));

function validate(name, source) {
  const filename = path.join(temporary, `${name}.yaml`);
  fs.writeFileSync(filename, source);
  return spawnSync(process.execPath, [tool, '--task', filename, '--source', model], {encoding: 'utf8'});
}

const valid = `cpu-implementation-task:
  model-source: current
  scope:
    requirement-ids: [show-shared-status]
  change-boundary:
    include: [internal/presentation/**]
    exclude: [CPU/**]
  verification: [project-tests, strict-cpu-validation, rendered-ui-review]
  diagnostic-references: [review/status.png]
`;
assert.equal(validate('valid', valid).status, 0, 'legitimate scope, verification and diagnostic evidence must be allowed');
assert.equal(validate('complete-model', valid.replace('requirement-ids: [show-shared-status]', 'complete-model: true').replace('exclude: [CPU/**]', 'exclude: []')).status, 0, 'complete current-model implementation must remain possible');

const invalid = new Map([
  ['visual-acceptance', valid.replace('  verification:', '  visual-acceptance: "Use a permanent legend"\n  verification:')],
  ['behavior-as-fix', valid.replace('  verification:', '  correction: "Retry every failed request"\n  verification:')],
  ['subjective-design', valid.replace('  verification:', '  design-guidance: "Make the hierarchy feel calmer"\n  verification:')],
  ['valid-id-plus-extra-rule', valid.replace('  verification:', '  acceptance-criteria: ["show-shared-status plus a blue badge"]\n  verification:')],
  ['historical-authority', valid.replace('  verification:', '  normative-sources: ["previous chat", "review/status.png"]\n  verification:')],
  ['complementary-free-text', `${valid}\nUse the screenshot as the required design.\n`],
]);
for (const [name, source] of invalid) {
  const result = validate(name, source);
  assert.notEqual(result.status, 0, `${name} must be rejected`);
  assert.ok(result.stderr.trim(), `${name} must report why validation failed`);
}

assert.notEqual(validate('unknown-requirement', valid.replace('show-shared-status', 'invented-requirement')).status, 0);
assert.notEqual(validate('parent-traversal', valid.replace('review/status.png', '../outside.png')).status, 0);

const method = fs.readFileSync(path.join(root, 'CPU', 'PROCESS', 'CPU-Implementation-Task-Contract.md'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
for (const phrase of ['Candidate product decision', 'stop before implementation', 'correct requirement-ID citation', 'prior chat', 'screenshot', 'only permitted implementation-task instruction envelope']) {
  assert.ok(agents.includes(phrase), `AGENTS.md lacks authority-gate phrase: ${phrase}`);
}
for (const phrase of ['cannot establish', 'never be reported as proof', 'Technical implementation choice', 'diagnostic-only']) {
  assert.ok(method.includes(phrase), `method lacks limitation or freedom: ${phrase}`);
}

console.log('Normative Instruction Authority Gate checks PASS');
