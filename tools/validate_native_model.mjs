#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadContextModel} from './native/context_model.mjs';
import {loadPulseModel} from './native/pulse_model.mjs';
import {loadUiModel} from './native/ui_model.mjs';
import {loadDeploymentModel} from './native/deployment_model.mjs';

const {parseDocument} = createRequire(import.meta.url)('yaml');

function sourceOption(argv) {
  const index = argv.indexOf('--source');
  if (index < 0 || !argv[index + 1]) return path.resolve('CPU');
  if (argv.length !== 2) throw new Error(`Unknown argument: ${argv.find((_, item) => item !== index && item !== index + 1)}`);
  return path.resolve(argv[index + 1]);
}

try {
  const source = sourceOption(process.argv.slice(2));
  loadContextModel(source);
  loadPulseModel(source);
  loadUiModel(source);
  loadDeploymentModel(source);
  const filename = path.join(source, 'requirements.yaml');
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(document.errors.map(error => error.message).join('; '));
  const requirements = document.toJS({mapAsMap: false}).requirements;
  const allowed = ['context.', 'pulse.', 'ui.', 'deployment.'];
  for (const target of Object.keys(requirements)) {
    if (!allowed.some(prefix => target.startsWith(prefix))) throw new Error(`Unresolved requirement target: ${target}`);
  }
  console.log(`Validated Context, Pulse, UI, Deployment, and ${Object.keys(requirements).length} requirement targets.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
