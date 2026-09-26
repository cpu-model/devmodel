import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-native-deployment-'));
const output = path.join(directory, 'deployment.pdf');
const result = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_deployment_native.mjs'),
  '--source', path.join(root, 'examples', 'model'), '--output', output,
], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(output), true);
const source = fs.readFileSync(output, 'latin1');
assert.match(source, /\/Title <FEFF0043005000550020004400650070006C006F0079006D0065006E0074>/);
assert.match(source, /\/Subtype \/Text/);
assert.match(source, /\/Name \/Comment/);
assert.match(source, /\/AP <<\n\/N /);
assert.match(source, /\/BBox \[ 0 0 14 14 \]/);
assert.match(source, /\/Subtype \/Popup/);
assert.doesNotMatch(source, /\/Open true/);
assert.doesNotMatch(source, /<svg|\/Image\b/);
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 5);
assert.match(source, /FEFF0054006800650020006100700070006C00690063006100740069006F006E/);
console.log('Native Deployment PDF checks passed');
