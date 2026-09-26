import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-native-context-'));
const output = path.join(directory, 'context.pdf');
const result = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_context_native.mjs'),
  '--source', path.join(root, 'examples', 'model'),
  '--output', output,
], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(output), true);
const source = fs.readFileSync(output, 'latin1');
assert.match(source, /\/Subtype \/Text/);
assert.match(source, /\/Name \/Comment/);
assert.match(source, /\/AP <<\n\/N /);
assert.match(source, /\/BBox \[ 0 0 14 14 \]/);
assert.match(source, /\/Subtype \/Popup/);
assert.match(source, /\/C \[ 0\.9 0\.95 1 \]/);
assert.doesNotMatch(source, /\/Open true/);
assert.doesNotMatch(source, /<svg|\/Image\b/);
assert.match(source, /FEFF005400680065002000730079007300740065006D/);
console.log('Native Context PDF checks passed');
