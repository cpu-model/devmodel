import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {stdio: 'inherit'});
  assert.equal(result.status, 0, `${script} failed`);
}

run('tests/validate_naming.mjs');
run('tools/validate_native_model.mjs', ['--source', path.join(root, 'examples', 'model')]);
run('tests/deployment_validation.mjs');
run('tests/artifact_validation.mjs');
run('tests/pdf_review.mjs');
run('tests/render_presentation.mjs');
run('tests/native_context_pdf.mjs');
run('tests/native_pulse_pdf.mjs');
run('tests/native_ui_pdf.mjs');
run('tests/native_deployment_pdf.mjs');
run('tests/native_model_render.mjs');

if (fs.existsSync(path.join(root, 'install.sh'))) run('tests/install.mjs');
