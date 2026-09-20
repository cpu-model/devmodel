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

function invalidDeployment(change, expected) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-deployment-invalid-'));
  try {
    for (const file of ['context.yaml', 'pulse.yaml', 'ui.yaml', 'requirements.yaml', 'deployment.yaml']) {
      fs.copyFileSync(path.join(example, file), path.join(directory, file));
    }
    const filename = path.join(directory, 'deployment.yaml');
    const document = parse(fs.readFileSync(filename, 'utf8'));
    change(document.deployment);
    fs.writeFileSync(filename, stringify(document));
    const result = spawnSync(process.execPath, [
      path.join(root, 'tools', 'render_model.mjs'),
      '--source', directory,
      '--validate-only',
    ], {encoding: 'utf8'});
    assert.notEqual(result.status, 0, 'Expected deployment validation to fail');
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

invalidDeployment(deployment => {
  delete deployment.programs[0].implementation.platform;
}, /requires an explicitly selected web UI platform/);

invalidDeployment(deployment => {
  deployment.programs[0].ports = [];
}, /requires an explicit HTTP or HTTPS port/);

invalidDeployment(deployment => {
  deployment.environment.variables.push({name: 'SECRET', secret: true, default: 'must-not-appear'});
}, /must not define a default value/);

invalidDeployment(deployment => {
  deployment.connections[0].to = 'missing.port';
}, /Invalid deployment connection/);

invalidDeployment(deployment => {
  deployment.programs[1].services = [];
}, /requires services/);

invalidDeployment(deployment => {
  deployment.programs[0].ports[0]['host-port'] = {variable: 'UNDECLARED_PORT', default: 8080};
}, /host-port.variable is not declared/);

invalidDeployment(deployment => {
  deployment.programs[0].ports[0]['host-port'] = {variable: 'HTTP_HOST_PORT', default: 70000};
}, /host-port.default is invalid/);

console.log('Validated strict Deployment rejection cases.');
