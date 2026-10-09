import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');
const dispositions = new Set(['external-input', 'transfer', 'derived']);
const responsibilityKinds = new Set(['functional', 'infrastructure']);

const mapping = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  return value;
};
const list = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
};
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
function uniqueStrings(value, label) {
  const result = list(value, label);
  const seen = new Set();
  for (const [index, item] of result.entries()) {
    nonEmpty(item, `${label}[${index}]`);
    if (seen.has(item)) throw new Error(`Duplicate reference in ${label}: ${item}`);
    seen.add(item);
  }
  return result;
}
function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

export function loadComponentsModel(sourceDirectory, pulse, requirements) {
  const filename = path.join(sourceDirectory, 'components.yaml');
  if (!fs.existsSync(filename)) return null;

  const source = parseYaml(filename);
  exactFields(source, ['components'], ['components'], 'components.yaml');
  const root = mapping(source.components, 'components');
  exactFields(root, ['components', 'domain-information'], ['components', 'domain-information'], 'components');
  const requirementTargets = new Map();
  for (const [target, targetRequirements] of Object.entries(requirements)) {
    for (const requirement of targetRequirements) requirementTargets.set(requirement.id, target);
  }
  const requirementIds = new Set(requirementTargets.keys());
  const behaviorIds = new Set(pulse.behaviors.map(behavior => behavior.id));
  const informationIds = new Set((pulse['domain-information'] || []).map(information => information.id));
  const componentIds = new Set();
  const assignedBehaviors = new Map();
  const evidenceByComponent = new Map();
  const prerequisitesByComponent = new Map();
  const components = list(root.components, 'components.components');
  if (!components.length) throw new Error('components.components must not be empty; omit components.yaml when no Component is normative');

  for (const [index, component] of components.entries()) {
    const label = `components.components[${index}]`;
    exactFields(component, ['id', 'name', 'responsibility', 'kind', 'behaviors', 'requirement-evidence', 'reconciliation'], ['id', 'name', 'responsibility', 'behaviors'], label);
    id(component.id, `${label}.id`);
    nonEmpty(component.name, `${label}.name`);
    nonEmpty(component.responsibility, `${label}.responsibility`);
    const kind = component.kind || 'functional';
    if (!responsibilityKinds.has(kind)) throw new Error(`Invalid Component responsibility kind: ${kind}`);
    if (componentIds.has(component.id)) throw new Error(`Duplicate Component ID: ${component.id}`);
    componentIds.add(component.id);
    const behaviors = uniqueStrings(component.behaviors, `${label}.behaviors`);
    for (const behavior of behaviors) {
      if (!behaviorIds.has(behavior)) throw new Error(`Unknown Pulse Behavior in components.yaml: ${behavior}`);
      if (assignedBehaviors.has(behavior)) throw new Error(`Duplicate Component assignment for Pulse Behavior: ${behavior}`);
      assignedBehaviors.set(behavior, component.id);
    }
    const evidence = 'requirement-evidence' in component ? uniqueStrings(component['requirement-evidence'], `${label}.requirement-evidence`) : [];
    for (const requirementId of evidence) {
      if (!requirementIds.has(requirementId)) throw new Error(`Unknown requirement evidence: ${requirementId}`);
    }
    if (kind === 'infrastructure' && !evidence.some(requirementId => requirementTargets.get(requirementId).startsWith('deployment.'))) {
      throw new Error(`Infrastructure Component requires Deployment requirement evidence: ${component.id}`);
    }
    evidenceByComponent.set(component.id, evidence.length);
    if ('reconciliation' in component) {
      exactFields(component.reconciliation, ['requires'], ['requires'], `${label}.reconciliation`);
      prerequisitesByComponent.set(component.id,
        uniqueStrings(component.reconciliation.requires, `${label}.reconciliation.requires`));
    } else prerequisitesByComponent.set(component.id, []);
  }

  const reconciliationParticipants = new Set();
  for (const [componentId, prerequisites] of prerequisitesByComponent) {
    for (const prerequisite of prerequisites) {
      if (!componentIds.has(prerequisite)) throw new Error(`Unknown Component reconciliation prerequisite: ${prerequisite}`);
      if (prerequisite === componentId) throw new Error(`Component reconciliation self dependency: ${componentId}`);
      reconciliationParticipants.add(componentId);
      reconciliationParticipants.add(prerequisite);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(componentId, path = []) {
    if (visiting.has(componentId)) {
      const start = path.indexOf(componentId);
      throw new Error(`Component reconciliation cycle: ${[...path.slice(start), componentId].join(' -> ')}`);
    }
    if (visited.has(componentId)) return;
    visiting.add(componentId);
    for (const prerequisite of prerequisitesByComponent.get(componentId) || []) visit(prerequisite, [...path, componentId]);
    visiting.delete(componentId);
    visited.add(componentId);
  }
  for (const componentId of componentIds) visit(componentId);

  for (const behaviorId of behaviorIds) {
    if (!assignedBehaviors.has(behaviorId)) throw new Error(`Missing Component assignment for Pulse Behavior: ${behaviorId}`);
  }

  const mappedInformation = new Set();
  const authorityCounts = new Map();
  for (const [index, information] of list(root['domain-information'], 'components.domain-information').entries()) {
    const label = `components.domain-information[${index}]`;
    exactFields(information, ['id', 'authority', 'disposition'], ['id'], label);
    id(information.id, `${label}.id`);
    if (!informationIds.has(information.id)) throw new Error(`Unknown Domain Information in components.yaml: ${information.id}`);
    if (mappedInformation.has(information.id)) throw new Error(`Duplicate Domain Information mapping: ${information.id}`);
    mappedInformation.add(information.id);
    if (('authority' in information) === ('disposition' in information)) {
      throw new Error(`${label} requires authority XOR disposition`);
    }
    if ('authority' in information) {
      nonEmpty(information.authority, `${label}.authority`);
      if (!componentIds.has(information.authority)) throw new Error(`Unknown Component authority: ${information.authority}`);
      authorityCounts.set(information.authority, (authorityCounts.get(information.authority) || 0) + 1);
    } else {
      nonEmpty(information.disposition, `${label}.disposition`);
      if (!dispositions.has(information.disposition)) throw new Error(`Invalid Domain Information disposition: ${information.disposition}`);
    }
  }
  for (const informationId of informationIds) {
    if (!mappedInformation.has(informationId)) throw new Error(`Missing Domain Information mapping: ${informationId}`);
  }
  for (const component of components) {
    if (!component.behaviors.length && !(authorityCounts.get(component.id) > 0)
      && !(evidenceByComponent.get(component.id) > 0) && !reconciliationParticipants.has(component.id)) {
      throw new Error(`Component lacks structural grounding: ${component.id}`);
    }
  }
  return root;
}
