#!/usr/bin/env node
import path from 'node:path';
import {loadContextModel} from './native/context_model.mjs';
import {loadPulseModel} from './native/pulse_model.mjs';
import {loadUiModel} from './native/ui_model.mjs';
import {loadDeploymentModel} from './native/deployment_model.mjs';
import {loadRequirements} from './native/requirements_model.mjs';
import {loadComponentsModel} from './native/components_model.mjs';

function sourceOption(argv) {
  const index = argv.indexOf('--source');
  if (index < 0 || !argv[index + 1]) return path.resolve('CPU');
  if (argv.length !== 2) throw new Error(`Unknown argument: ${argv.find((_, item) => item !== index && item !== index + 1)}`);
  return path.resolve(argv[index + 1]);
}

try {
  const source = sourceOption(process.argv.slice(2));
  loadContextModel(source);
  const pulse = loadPulseModel(source);
  loadUiModel(source);
  loadDeploymentModel(source);
  const requirements = loadRequirements(source);
  const allowed = ['context.', 'pulse.', 'ui.', 'deployment.'];
  for (const target of Object.keys(requirements)) {
    if (!allowed.some(prefix => target.startsWith(prefix))) throw new Error(`Unresolved requirement target: ${target}`);
  }
  const components = loadComponentsModel(source, pulse.pulse, requirements);
  const componentMessage = components
    ? `, and ${components.components.length} Component${components.components.length === 1 ? '' : 's'}`
    : '';
  console.log(`Validated Context, Pulse, UI, Deployment, and ${Object.keys(requirements).length} requirement targets${componentMessage}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
