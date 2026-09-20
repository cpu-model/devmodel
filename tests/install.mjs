import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-model-install-test-'));
const targetWithoutIgnore = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-model-install-no-ignore-test-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  assert.equal(result.status, 0, `${command} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

try {
  run('git', ['init', '-q', target]);
  fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing instructions\n\nKeep this text.\n');
  const existingIgnore = 'dist/\n*.local\n';
  fs.writeFileSync(path.join(target, '.gitignore'), existingIgnore);

  const environment = {...process.env, CPU_MODEL_SOURCE_DIR: root};
  run(path.join(root, 'install.sh'), [target], {env: environment});
  run(path.join(root, 'install.sh'), [target], {env: environment});

  const installedIgnore = fs.readFileSync(path.join(target, '.gitignore'), 'utf8');
  assert.ok(installedIgnore.startsWith(existingIgnore), 'Existing .gitignore content was not preserved');
  assert.equal((installedIgnore.match(/^CPU\/node_modules\/$/gm) || []).length, 1);

  run('git', ['init', '-q', targetWithoutIgnore]);
  assert.ok(!fs.existsSync(path.join(targetWithoutIgnore, '.gitignore')));
  run(path.join(root, 'install.sh'), [targetWithoutIgnore], {env: environment});
  assert.equal(fs.readFileSync(path.join(targetWithoutIgnore, '.gitignore'), 'utf8'), 'CPU/node_modules/\n');

  const agents = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Keep this text\./);
  assert.equal((agents.match(/<!-- cpu-model:begin -->/g) || []).length, 1);
  assert.equal((agents.match(/Keep this text\./g) || []).length, 1);
  assert.match(agents, /cpu-model\/devmodel[^\n]+normative source/i);
  assert.match(agents, /project repository[^\n]+source of truth[^\n]+concrete semantic model/i);
  assert.match(agents, /Codex[^\n]+local repository execution/i);
  assert.match(agents, /Codex[^\n]+edit semantic YAML[^\n]+delegated/i);
  assert.match(agents, /default branch[^\n]+normal line[^\n]+incremental development/i);
  assert.match(agents, /Codex[^\n]+`git pull`[^\n]+safely synchronize/i);
  assert.match(agents, /Codex[^\n]+local implementation[^\n]+testing[^\n]+validation/i);
  assert.match(agents, /user normally commits and pushes/i);
  assert.match(agents, /Branches, pull requests, and merges[^\n]+only when the user explicitly requests/i);
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

  const installedWorkflow = fs.readFileSync(path.join(target, 'CPU', 'AGENTS.md'), 'utf8');
  assert.match(installedWorkflow, /default branch is the normal development line/i);
  assert.match(installedWorkflow, /Codex may use `git pull`/i);
  assert.match(installedWorkflow, /pull → implement\/model edit → build\/test\/validate\/review → report → user commit → user push/i);
  assert.match(installedWorkflow, /user normally performs `git commit` and `git push`/i);
  assert.match(installedWorkflow, /Branches, pull requests, merges, and repository housekeeping are not part of the normal CPU workflow/i);
  assert.match(installedWorkflow, /does not normally create branches or commits, push, create pull requests, merge, delete branches/i);

  for (const script of ['tools/render_model.mjs', 'tools/finish_model.mjs', 'tools/serve_model.mjs']) {
    run(process.execPath, ['--check', script], {cwd: path.join(target, 'CPU')});
  }
  console.log('Validated repeatable CPU installation into a target repository.');
} finally {
  fs.rmSync(target, {recursive: true, force: true});
  fs.rmSync(targetWithoutIgnore, {recursive: true, force: true});
}
