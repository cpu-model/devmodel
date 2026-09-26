import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-native-ui-'));
const output = path.join(directory, 'ui.pdf');
const result = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_ui_native.mjs'),
  '--source', path.join(root, 'examples', 'model'), '--output', output,
], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(output), true);
const source = fs.readFileSync(output, 'latin1');
assert.match(source, /\/Title <FEFF004300500055002000550049>/);
assert.match(source, /\/Subtype \/Text/);
assert.match(source, /\/Name \/Comment/);
assert.match(source, /\/AP <<\n\/N /);
assert.match(source, /\/BBox \[ 0 0 14 14 \]/);
assert.match(source, /\/Subtype \/Popup/);
assert.doesNotMatch(source, /\/Open true/);
assert.doesNotMatch(source, /<svg|\/Image\b/);
// A SubView is annotated once on its own card, not repeated by each include.
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 4);
assert.match(source, /FEFF00540068006500200075007300650072/);
console.log('Native UI PDF checks passed');
