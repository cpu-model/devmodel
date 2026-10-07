import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadRequirements, requirementsForPrefix} from './requirements_model.mjs';

const {parseDocument} = createRequire(import.meta.url)('yaml');
const mapping = (value, label) => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`); return value; };
const list = (value, label) => { if (!Array.isArray(value)) throw new Error(`${label} must be a list`); return value; };
function exactFields(value, allowed, required, label) {
  mapping(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
}
function nonEmpty(value, label) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`); return value; }
function id(value, label) { nonEmpty(value, label); if (value.includes('.')) throw new Error(`${label} must not contain a period`); return value; }
function uniqueReferences(value, label, knownIds) {
  const seen = new Set();
  for (const [index, reference] of list(value, label).entries()) {
    nonEmpty(reference, `${label}[${index}]`);
    if (!knownIds.has(reference)) throw new Error(`Unknown Domain Information reference: ${reference}`);
    if (seen.has(reference)) throw new Error(`Duplicate Domain Information reference in ${label}: ${reference}`);
    seen.add(reference);
  }
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
  exactFields(pulse, ['capabilities', 'capability-flows', 'domain-information', 'behaviors', 'pulses', 'flows'], ['behaviors', 'pulses', 'flows'], 'pulse');
  const hasCapabilities = 'capabilities' in pulse;
  const capabilities = hasCapabilities ? list(pulse.capabilities, 'pulse.capabilities') : [];
  const capabilityIds = new Set();
  for (const [index, capability] of capabilities.entries()) {
    exactFields(capability, ['id', 'name'], ['id', 'name'], `pulse.capabilities[${index}]`);
    id(capability.id, `pulse.capabilities[${index}].id`); nonEmpty(capability.name, `pulse.capabilities[${index}].name`);
    if (capabilityIds.has(capability.id)) throw new Error(`Duplicate Capability ID: ${capability.id}`);
    capabilityIds.add(capability.id);
  }
  if (!hasCapabilities && 'capability-flows' in pulse) throw new Error('pulse.capability-flows is forbidden when pulse.capabilities is absent');
  const capabilityFlows = list(pulse['capability-flows'] || [], 'pulse.capability-flows');
  const capabilityFlowIds = new Set();
  for (const [index, capabilityFlow] of capabilityFlows.entries()) {
    exactFields(capabilityFlow, ['id', 'name', 'capabilities'], ['id', 'name', 'capabilities'], `pulse.capability-flows[${index}]`);
    id(capabilityFlow.id, `pulse.capability-flows[${index}].id`); nonEmpty(capabilityFlow.name, `pulse.capability-flows[${index}].name`);
    if (capabilityFlowIds.has(capabilityFlow.id)) throw new Error(`Duplicate Capability Flow ID: ${capabilityFlow.id}`);
    const references = list(capabilityFlow.capabilities, `pulse.capability-flows[${index}].capabilities`);
    if (references.length < 2) throw new Error(`Capability Flow requires at least two Capabilities: ${capabilityFlow.id}`);
    const seen = new Set();
    for (const [referenceIndex, reference] of references.entries()) {
      nonEmpty(reference, `pulse.capability-flows[${index}].capabilities[${referenceIndex}]`);
      if (!capabilityIds.has(reference)) throw new Error(`Unknown Capability in Capability Flow ${capabilityFlow.id}: ${reference}`);
      if (seen.has(reference)) throw new Error(`Duplicate Capability in Capability Flow ${capabilityFlow.id}: ${reference}`);
      seen.add(reference);
    }
    capabilityFlowIds.add(capabilityFlow.id);
  }
  const domainInformation = list(pulse['domain-information'] || [], 'pulse.domain-information');
  const informationIds = new Set();
  for (const [index, information] of domainInformation.entries()) {
    exactFields(information, ['id', 'name'], ['id', 'name'], `pulse.domain-information[${index}]`);
    id(information.id, `pulse.domain-information[${index}].id`); nonEmpty(information.name, `pulse.domain-information[${index}].name`);
    if (informationIds.has(information.id)) throw new Error(`Duplicate Domain Information ID: ${information.id}`);
    informationIds.add(information.id);
  }
  const behaviorIds = new Set();
  for (const [index, behavior] of list(pulse.behaviors, 'pulse.behaviors').entries()) {
    exactFields(behavior, ['id', 'name', 'capability', 'information-in', 'information-out'], hasCapabilities ? ['id', 'name', 'capability'] : ['id', 'name'], `pulse.behaviors[${index}]`);
    id(behavior.id, `pulse.behaviors[${index}].id`); nonEmpty(behavior.name, `pulse.behaviors[${index}].name`);
    if (behaviorIds.has(behavior.id)) throw new Error(`Duplicate Pulse Behavior ID: ${behavior.id}`);
    if (hasCapabilities && !capabilityIds.has(behavior.capability)) throw new Error(`Unknown Capability for Behavior: ${behavior.id}`);
    if (!hasCapabilities && 'capability' in behavior) throw new Error(`Behavior capability is forbidden when pulse.capabilities is absent: ${behavior.id}`);
    if ('information-in' in behavior) uniqueReferences(behavior['information-in'], `pulse.behaviors[${index}].information-in`, informationIds);
    if ('information-out' in behavior) uniqueReferences(behavior['information-out'], `pulse.behaviors[${index}].information-out`, informationIds);
    behaviorIds.add(behavior.id);
  }
  for (const information of domainInformation) if (!pulse.behaviors.some(behavior => (behavior['information-in'] || []).includes(information.id) || (behavior['information-out'] || []).includes(information.id))) throw new Error(`Unreferenced Domain Information: ${information.id}`);
  const pulseIds = new Set(); const displays = new Set();
  for (const [index, event] of list(pulse.pulses, 'pulse.pulses').entries()) {
    exactFields(event, ['id', 'display', 'name'], ['id', 'display', 'name'], `pulse.pulses[${index}]`);
    id(event.id, `pulse.pulses[${index}].id`); nonEmpty(event.display, `pulse.pulses[${index}].display`); nonEmpty(event.name, `pulse.pulses[${index}].name`);
    if (pulseIds.has(event.id)) throw new Error(`Duplicate Pulse ID: ${event.id}`);
    if (displays.has(event.display)) throw new Error(`Duplicate Pulse display: ${event.display}`);
    pulseIds.add(event.id); displays.add(event.display);
  }
  for (const [index, flow] of list(pulse.flows, 'pulse.flows').entries()) {
    exactFields(flow, ['trigger', 'from', 'pulse', 'to'], ['pulse', 'to'], `pulse.flows[${index}]`);
    if (('trigger' in flow) === ('from' in flow)) throw new Error(`Pulse flow ${index} requires trigger XOR from`);
    if ('trigger' in flow) nonEmpty(flow.trigger, `pulse.flows[${index}].trigger`);
    if ('from' in flow && !behaviorIds.has(flow.from)) throw new Error(`Unknown Pulse source Behavior: ${flow.from}`);
    if (!behaviorIds.has(flow.to)) throw new Error(`Unknown Pulse target Behavior: ${flow.to}`);
    if (!pulseIds.has(flow.pulse)) throw new Error(`Unknown Pulse reference: ${flow.pulse}`);
  }
  const behaviorById = new Map(pulse.behaviors.map(behavior => [behavior.id, behavior]));
  const supportedCapabilityRelations = new Set(pulse.flows.filter(flow => 'from' in flow)
    .map(flow => [behaviorById.get(flow.from).capability, behaviorById.get(flow.to).capability])
    .filter(([from, to]) => from && to && from !== to)
    .map(([from, to]) => `${from}\u0000${to}`));
  for (const capabilityFlow of capabilityFlows) {
    for (let index = 1; index < capabilityFlow.capabilities.length; index += 1) {
      const from = capabilityFlow.capabilities[index - 1];
      const to = capabilityFlow.capabilities[index];
      if (!supportedCapabilityRelations.has(`${from}\u0000${to}`)) {
        throw new Error(`Unsupported Capability Flow transition in ${capabilityFlow.id}: ${from} -> ${to}`);
      }
    }
  }
  const targets = new Set([...pulse.behaviors.map(item => `pulse.behavior.${item.id}`), ...pulse.pulses.map(item => `pulse.pulse.${item.id}`), ...domainInformation.map(item => `pulse.domain-information.${item.id}`)]);
  const requirements = requirementsForPrefix(loadRequirements(sourceDirectory), 'pulse.', targets, 'Pulse');
  return {pulse: {...pulse, 'capability-flows': capabilityFlows, 'domain-information': domainInformation}, requirements};
}
