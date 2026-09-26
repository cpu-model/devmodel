#!/usr/bin/env node
import path from 'node:path';
import {loadDeploymentModel} from './native/deployment_model.mjs';
import {layoutDeployment} from './native/deployment_layout.mjs';
import {renderDeploymentPdf} from './native/deployment_pdf.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}
const model = loadDeploymentModel(path.resolve(option('--source')));
const output = path.resolve(option('--output'));
await renderDeploymentPdf({layout: layoutDeployment(model.deployment), requirements: model.requirements, output});
console.log(`Native Deployment PDF ready: ${output}`);
