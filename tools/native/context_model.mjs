import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');

function mapping(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a mapping`);
  }
  return value;
}

function exactFields(value, allowed, required, label) {
  mapping(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) {
    throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
  }
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function id(value, label) {
  nonEmpty(value, label);
  if (value.includes('.')) throw new Error(`${label} must not contain a period`);
  return value;
}

function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}

function parseYaml(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const document = parseDocument(source, {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

export function loadContextModel(sourceDirectory) {
  const contextSource = parseYaml(path.join(sourceDirectory, 'context.yaml'));
  exactFields(contextSource, ['context'], ['context'], 'context.yaml');
  const context = mapping(contextSource.context, 'context');
  exactFields(context, ['system', 'parties', 'flows'], ['system', 'parties', 'flows'], 'context');
  exactFields(context.system, ['id', 'name'], ['id', 'name'], 'context.system');
  id(context.system.id, 'context.system.id');
  nonEmpty(context.system.name, 'context.system.name');

  const endpointIds = new Set([context.system.id]);
  for (const [index, party] of list(context.parties, 'context.parties').entries()) {
    exactFields(party, ['id', 'name', 'type'], ['id', 'name', 'type'], `context.parties[${index}]`);
    id(party.id, `context.parties[${index}].id`);
    nonEmpty(party.name, `context.parties[${index}].name`);
    if (!['person', 'external-system'].includes(party.type)) throw new Error(`Invalid Context party type: ${party.type}`);
    if (endpointIds.has(party.id)) throw new Error(`Duplicate Context endpoint ID: ${party.id}`);
    endpointIds.add(party.id);
  }

  const flowIds = new Set();
  for (const [index, flow] of list(context.flows, 'context.flows').entries()) {
    exactFields(flow, ['id', 'from', 'to', 'name', 'initiative'], ['id', 'from', 'to', 'name'], `context.flows[${index}]`);
    id(flow.id, `context.flows[${index}].id`);
    nonEmpty(flow.name, `context.flows[${index}].name`);
    if (flowIds.has(flow.id)) throw new Error(`Duplicate Context flow ID: ${flow.id}`);
    flowIds.add(flow.id);
    if (!endpointIds.has(flow.from) || !endpointIds.has(flow.to) || flow.from === flow.to) {
      throw new Error(`Invalid Context flow: ${flow.id}`);
    }
    if ('initiative' in flow && ![flow.from, flow.to].includes(flow.initiative)) {
      throw new Error(`Invalid Context initiative: ${flow.id}`);
    }
  }

  const requirementsSource = parseYaml(path.join(sourceDirectory, 'requirements.yaml'));
  exactFields(requirementsSource, ['requirements'], ['requirements'], 'requirements.yaml');
  const allRequirements = mapping(requirementsSource.requirements, 'requirements');
  const contextTargets = new Set([
    `context.system.${context.system.id}`,
    ...context.parties.map(party => `context.party.${party.id}`),
    ...context.flows.map(flow => `context.flow.${flow.id}`),
  ]);
  const requirements = {};
  for (const [target, values] of Object.entries(allRequirements)) {
    if (!target.startsWith('context.')) continue;
    if (!contextTargets.has(target)) throw new Error(`Unknown Context requirement target: ${target}`);
    list(values, `requirements.${target}`);
    if (!values.length) throw new Error(`requirements.${target} must not be empty`);
    requirements[target] = values.map((value, index) => nonEmpty(value, `requirements.${target}[${index}]`));
  }

  return {context, requirements};
}
