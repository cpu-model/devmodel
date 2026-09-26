#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadContextModel} from './native/context_model.mjs';
import {layoutContext} from './native/context_layout.mjs';
import {renderContextPdf} from './native/context_pdf.mjs';
import {loadPulseModel} from './native/pulse_model.mjs';
import {layoutPulse} from './native/pulse_layout.mjs';
import {renderPulsePdf} from './native/pulse_pdf.mjs';
import {loadUiModel} from './native/ui_model.mjs';
import {layoutUi} from './native/ui_layout.mjs';
import {renderUiPdf} from './native/ui_pdf.mjs';
import {loadDeploymentModel} from './native/deployment_model.mjs';
import {layoutDeployment} from './native/deployment_layout.mjs';
import {renderDeploymentPdf} from './native/deployment_pdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {source: path.resolve('CPU'), out: null};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source') options.source = path.resolve(argv[++index]);
    else if (argument === '--out') options.out = path.resolve(argv[++index]);
    else if (argument === '--review-title') index += 1;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  options.out ||= options.source;
  return options;
}

function validateCompleteModel(source) {
  const result = spawnSync(process.execPath, [path.join(here, 'validate_native_model.mjs'), '--source', source], {encoding: 'utf8'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || 'Strict model validation failed');
}

const options = parseArgs(process.argv.slice(2));
validateCompleteModel(options.source);
fs.mkdirSync(options.out, {recursive: true});

const context = loadContextModel(options.source);
const pulse = loadPulseModel(options.source);
const ui = loadUiModel(options.source);
const deployment = loadDeploymentModel(options.source);

await Promise.all([
  renderContextPdf({layout: layoutContext(context.context), requirements: context.requirements, output: path.join(options.out, 'context.pdf')}),
  renderPulsePdf({layout: layoutPulse(pulse.pulse), requirements: pulse.requirements, output: path.join(options.out, 'pulse.pdf')}),
  renderUiPdf({layout: layoutUi(ui.ui), requirements: ui.requirements, output: path.join(options.out, 'ui.pdf')}),
  renderDeploymentPdf({layout: layoutDeployment(deployment.deployment), requirements: deployment.requirements, output: path.join(options.out, 'deployment.pdf')}),
]);

console.log(`Rendered context.pdf, pulse.pdf, ui.pdf, and deployment.pdf in ${options.out}`);
