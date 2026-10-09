import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const method = read('CPU/PROCESS/CPU-Component-Discovery.md');
const agents = read('AGENTS.md');
const spec = read('SPEC.md');
const examples = read('examples/component-discovery.md');

// This checks publication and internal consistency of the documented gate.
// It does NOT assert that any project's human review has been completed.
assert.match(method, /## 3A\. Substitutability Discovery/);
assert.match(method, /before beginning Component Discovery/i);
assert.match(method, /Human decision/);
assert.match(method, /Contract normalization/);
assert.match(method, /source-level substitution/i);
assert.match(method, /requirements\.yaml/);
assert.match(method, /accepted set is empty/i);
assert.match(method, /binding Component-boundary evidence/i);
assert.match(method, /stop rather than weakening/i);
assert.match(method, /Perform Component Discovery only after the mandatory Substitutability Discovery gate/);
assert.match(agents, /Substitutability Discovery/);
assert.match(spec, /Substitutability Discovery/);
assert.match(examples, /PASS \(empty\)/);
assert.match(examples, /BLOCK:/);
console.log('Substitutability methodology documentation checks PASS');
