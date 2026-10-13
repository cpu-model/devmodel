import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const method = read('CPU/PROCESS/CPU-History-Migration.md');
const agents = read('AGENTS.md');
const spec = read('SPEC.md');
const components = read('CPU/PROCESS/CPU-Component-Discovery.md');

// Publication and normative integration, not a substitute for semantic review
// or for executing an actual history migration.
for (const heading of ['Purpose and scope', 'Applicability gate', 'Discovery',
  'Migration contract', 'Execution and reconciliation',
  'Verification and acceptance', 'Evidence and realization', 'Review checklist']) {
  assert.ok(method.includes(heading), `Missing section: ${heading}`);
}
for (const term of ['preserved', 'transformed', 'unmigratable',
  'domain meaning', 'provenance', 'retry', 'cutover', 'RECONCILED']) {
  assert.ok(method.includes(term), `Missing contract concept: ${term}`);
}
assert.match(method, /does not add a CPU artifact/);
assert.match(method, /must not be exposed as authoritative/);
assert.match(method, /must not become RECONCILED/);
assert.match(method, /does not transfer domain information authority/);
assert.match(agents, /History Migration prerequisite/);
assert.match(agents, /CPU-History-Migration\.md/);
assert.match(spec, /CPU-History-Migration\.md/);
assert.match(components, /migration, and recovery/);
assert.match(components, /Persistence does not own state/);
console.log('History Migration methodology documentation checks PASS');
