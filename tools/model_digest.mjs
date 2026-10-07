#!/usr/bin/env node
import path from 'node:path';
import {baseModelDigest} from './native/base_model_digest.mjs';
import {loadContextModel} from './native/context_model.mjs';
import {loadPulseModel} from './native/pulse_model.mjs';
import {loadUiModel} from './native/ui_model.mjs';
import {loadDeploymentModel} from './native/deployment_model.mjs';
import {loadRequirements} from './native/requirements_model.mjs';

const args = process.argv.slice(2);
const index = args.indexOf('--source');
if (index < 0 || !args[index + 1] || args.length !== 2) {
  console.error('Usage: node tools/model_digest.mjs --source <model-directory>');
  process.exit(1);
}
try {
  const source = path.resolve(args[index + 1]);
  loadContextModel(source);
  loadPulseModel(source);
  loadUiModel(source);
  loadDeploymentModel(source);
  const requirements = loadRequirements(source);
  const allowed = ['context.', 'pulse.', 'ui.', 'deployment.'];
  for (const target of Object.keys(requirements)) {
    if (!allowed.some(prefix => target.startsWith(prefix))) throw new Error(`Unresolved requirement target: ${target}`);
  }
  console.log(baseModelDigest(source));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
