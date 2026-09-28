import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');

function mapping(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  return value;
}

function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function exactFields(value, allowed, required, label) {
  mapping(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
}

export function loadRequirements(sourceDirectory) {
  const filename = path.join(sourceDirectory, 'requirements.yaml');
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  const source = document.toJS({mapAsMap: false});
  exactFields(source, ['requirements'], ['requirements'], 'requirements.yaml');
  const collection = mapping(source.requirements, 'requirements');
  const ids = new Set();
  for (const [target, values] of Object.entries(collection)) {
    list(values, `requirements.${target}`);
    if (!values.length) throw new Error(`requirements.${target} must not be empty`);
    values.forEach((requirement, index) => {
      const label = `requirements.${target}[${index}]`;
      exactFields(requirement, ['id', 'text'], ['id', 'text'], label);
      nonEmpty(requirement.id, `${label}.id`);
      nonEmpty(requirement.text, `${label}.text`);
      if (requirement.id.includes('.')) throw new Error(`${label}.id must not contain a period`);
      if (ids.has(requirement.id)) throw new Error(`Duplicate requirement ID: ${requirement.id}`);
      ids.add(requirement.id);
    });
  }
  return collection;
}

export function requirementsForPrefix(allRequirements, prefix, targets, label) {
  const result = {};
  for (const [target, requirements] of Object.entries(allRequirements)) {
    if (!target.startsWith(prefix)) continue;
    if (!targets.has(target)) throw new Error(`Unknown ${label} requirement target: ${target}`);
    result[target] = requirements;
  }
  return result;
}
