import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const method = read('CPU/PROCESS/CPU-Component-Discovery.md');
const format = read('CPU/PROCESS/CPU-Artifact-Formats-v2.md');
const agents = read('AGENTS.md');
const spec = read('SPEC.md');
const examples = read('examples/component-discovery.md');

assert.match(method, /## 10\. Component Package Realization/);
assert.match(method, /begins only after `components\.yaml` has been approved and validated/);
assert.match(method, /exactly one primary Go package/);
assert.match(method, /A Go package realizes at most one Component/);
assert.match(method, /go list -json -deps -test/);
assert.match(method, /golang\.org\/x\/tools\/go\/packages/);
assert.match(method, /Do not create a general Go parser/);
assert.match(method, /cross-Component function and method calls/);
assert.match(method, /shared mutable state/);
assert.match(method, /interface normally belongs to the consuming Component/);
assert.match(method, /Generic `common`, `shared`, `utils`, `helpers`, `models`, or `types` packages are prohibited/);
assert.match(method, /### 10\.5 Import cycles and dependency inversion/);
assert.match(method, /### 10\.6 Automatically verifiable architecture rules/);
assert.match(method, /### 10\.7 Exceptions/);
assert.match(method, /an executable check that prevents the exception from widening/);
assert.match(method, /### 10\.8 Closure gate/);
assert.match(method, /Report \*\*FAIL \/ INCOMPLETE\*\*/);

assert.match(format, /Go package realization are maintained through realization reconciliation and Component Package Realization, not stored here/);
assert.match(agents, /perform Component Package Realization after semantic discovery/);
assert.match(spec, /After an approved Component architecture exists, Component Package Realization derives Go package boundaries/);
assert.match(examples, /go list -json -deps -test/);

console.log('Component Package Realization methodology checks PASS');
