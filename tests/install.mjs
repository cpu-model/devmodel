import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-model-install-test-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  assert.equal(result.status, 0, `${command} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

try {
  run('git', ['init', '-q', target]);
  fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing instructions\n\nKeep this text.\n');

  const environment = {...process.env, CPU_MODEL_SOURCE_DIR: root};
  run(path.join(root, 'install.sh'), [target], {env: environment});
  run(path.join(root, 'install.sh'), [target], {env: environment});

  const agents = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Keep this text\./);
  assert.equal((agents.match(/<!-- cpu-model:begin -->/g) || []).length, 1);
  assert.equal((agents.match(/Keep this text\./g) || []).length, 1);
  assert.match(agents, /cpu-model\/devmodel[^\n]+normative source/i);
  assert.match(agents, /project repository[^\n]+source of truth[^\n]+concrete semantic model/i);
  assert.match(agents, /ChatGPT[^\n]+directly[^\n]+semantic model[^\n]+GitHub/i);
  assert.match(agents, /Codex[^\n]+local repository execution/i);
  assert.match(agents, /Codex[^\n]+edit semantic YAML[^\n]+delegated/i);
  assert.match(agents, /complete workflow in `CPU\/AGENTS\.md`/i);
  assert.match(agents, /Project-specific instructions outside this managed block complement/i);

  for (const file of [
    'CPU/AGENTS.md',
    'CPU/SPEC.md',
    'CPU/PROCESS/CPU-Artifact-Formats-v1.md',
    'CPU/PROCESS/CPU-Visual-Language-v1.md',
    'CPU/tools/render_model.mjs',
    'CPU/tools/finish_model.mjs',
    'CPU/tools/serve_model.mjs',
    'CPU/examples/model/deployment.yaml',
    'CPU/tests/all.mjs',
    'CPU/tests/deployment_validation.mjs',
    'CPU/tests/artifact_validation.mjs',
  ]) {
    assert.ok(fs.existsSync(path.join(target, file)), `Missing installed file: ${file}`);
  }

  for (const file of ['AGENTS.md', 'SPEC.md']) {
    assert.equal(
      fs.readFileSync(path.join(target, 'CPU', file), 'utf8'),
      fs.readFileSync(path.join(root, file), 'utf8'),
      `Installed CPU/${file} does not match its normative source`,
    );
  }

  for (const script of ['tools/render_model.mjs', 'tools/finish_model.mjs', 'tools/serve_model.mjs']) {
    run(process.execPath, ['--check', script], {cwd: path.join(target, 'CPU')});
  }
  console.log('Validated repeatable CPU installation into a target repository.');
} finally {
  fs.rmSync(target, {recursive: true, force: true});
}
