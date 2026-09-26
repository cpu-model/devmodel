#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import {loadContextModel} from './native/context_model.mjs';
import {layoutContext} from './native/context_layout.mjs';
import {renderContextPdf} from './native/context_pdf.mjs';

function options(argv) {
  const result = {source: path.resolve('CPU'), output: path.resolve('output/native-context/context.pdf')};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source') result.source = path.resolve(argv[++index]);
    else if (argv[index] === '--output') result.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return result;
}

const selected = options(process.argv.slice(2));
const model = loadContextModel(selected.source);
const layout = layoutContext(model.context);
await renderContextPdf({...model, layout, output: selected.output});
console.log(`Native Context PDF ready: ${selected.output}`);
