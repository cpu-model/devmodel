import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');
const baseFiles = ['context.yaml', 'pulse.yaml', 'ui.yaml', 'deployment.yaml', 'requirements.yaml'];

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

export function baseModelDigest(sourceDirectory) {
  const model = Object.fromEntries(baseFiles.map(filename => [filename, parseYaml(path.join(sourceDirectory, filename))]));
  const content = JSON.stringify(canonical(model));
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}
