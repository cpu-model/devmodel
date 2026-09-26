#!/usr/bin/env node
import path from 'node:path';
import {loadUiModel} from './native/ui_model.mjs';
import {layoutUi} from './native/ui_layout.mjs';
import {renderUiPdf} from './native/ui_pdf.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

const model = loadUiModel(path.resolve(option('--source')));
const output = path.resolve(option('--output'));
await renderUiPdf({layout: layoutUi(model.ui), requirements: model.requirements, output});
console.log(`Native UI PDF ready: ${output}`);
