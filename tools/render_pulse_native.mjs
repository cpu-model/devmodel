#!/usr/bin/env node
import path from 'node:path';
import {loadPulseModel} from './native/pulse_model.mjs';
import {layoutPulse} from './native/pulse_layout.mjs';
import {renderPulsePdf} from './native/pulse_pdf.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

const source = path.resolve(option('--source'));
const output = path.resolve(option('--output'));
const model = loadPulseModel(source);
await renderPulsePdf({layout: layoutPulse(model.pulse), requirements: model.requirements, output});
console.log(`Native Pulse PDF ready: ${output}`);
