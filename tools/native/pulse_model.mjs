import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');

function mapping(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  return value;
}

function exactFields(value, allowed, required, label) {
  mapping(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
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
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

export function loadPulseModel(sourceDirectory) {
  const source = parseYaml(path.join(sourceDirectory, 'pulse.yaml'));
  exactFields(source, ['pulse'], ['pulse'], 'pulse.yaml');
  const pulse = mapping(source.pulse, 'pulse');
  exactFields(pulse, ['behaviors', 'pulses', 'flows'], ['behaviors', 'pulses', 'flows'], 'pulse');

  const behaviorIds = new Set();
  for (const [index, behavior] of list(pulse.behaviors, 'pulse.behaviors').entries()) {
    exactFields(behavior, ['id', 'name'], ['id', 'name'], `pulse.behaviors[${index}]`);
    id(behavior.id, `pulse.behaviors[${index}].id`);
    nonEmpty(behavior.name, `pulse.behaviors[${index}].name`);
    if (behaviorIds.has(behavior.id)) throw new Error(`Duplicate Pulse Behavior ID: ${behavior.id}`);
    behaviorIds.add(behavior.id);
  }

  const pulseIds = new Set();
  const displays = new Set();
  for (const [index, event] of list(pulse.pulses, 'pulse.pulses').entries()) {
    exactFields(event, ['id', 'display', 'name'], ['id', 'display', 'name'], `pulse.pulses[${index}]`);
    id(event.id, `pulse.pulses[${index}].id`);
    nonEmpty(event.display, `pulse.pulses[${index}].display`);
    nonEmpty(event.name, `pulse.pulses[${index}].name`);
    if (pulseIds.has(event.id)) throw new Error(`Duplicate Pulse ID: ${event.id}`);
    if (displays.has(event.display)) throw new Error(`Duplicate Pulse display: ${event.display}`);
    pulseIds.add(event.id);
    displays.add(event.display);
  }

  for (const [index, flow] of list(pulse.flows, 'pulse.flows').entries()) {
    exactFields(flow, ['trigger', 'from', 'pulse', 'to'], ['pulse', 'to'], `pulse.flows[${index}]`);
    if (('trigger' in flow) === ('from' in flow)) throw new Error(`Pulse flow ${index} requires trigger XOR from`);
    if ('trigger' in flow) nonEmpty(flow.trigger, `pulse.flows[${index}].trigger`);
    if ('from' in flow && !behaviorIds.has(flow.from)) throw new Error(`Unknown Pulse source Behavior: ${flow.from}`);
    if (!behaviorIds.has(flow.to)) throw new Error(`Unknown Pulse target Behavior: ${flow.to}`);
    if (!pulseIds.has(flow.pulse)) throw new Error(`Unknown Pulse reference: ${flow.pulse}`);
  }

  const requirementsSource = parseYaml(path.join(sourceDirectory, 'requirements.yaml'));
  exactFields(requirementsSource, ['requirements'], ['requirements'], 'requirements.yaml');
  const allRequirements = mapping(requirementsSource.requirements, 'requirements');
  const targets = new Set([
    ...pulse.behaviors.map(item => `pulse.behavior.${item.id}`),
    ...pulse.pulses.map(item => `pulse.pulse.${item.id}`),
  ]);
  const requirements = {};
  for (const [target, values] of Object.entries(allRequirements)) {
    if (!target.startsWith('pulse.')) continue;
    if (!targets.has(target)) throw new Error(`Unknown Pulse requirement target: ${target}`);
    list(values, `requirements.${target}`);
    if (!values.length) throw new Error(`requirements.${target} must not be empty`);
    requirements[target] = values.map((value, index) => nonEmpty(value, `requirements.${target}[${index}]`));
  }

  return {pulse, requirements};
}
