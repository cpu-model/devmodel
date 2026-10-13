import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadRequirements, requirementsForPrefix} from './requirements_model.mjs';

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

function optionalList(value, label) {
  return list(value === undefined ? [] : value, label);
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
  return value;
}

function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

function validateActions(items, label) {
  const ids = new Set();
  for (const [index, item] of optionalList(items, label).entries()) {
    exactFields(item, ['id', 'name'], ['id', 'name'], `${label}[${index}]`);
    id(item.id, `${label}[${index}].id`);
    nonEmpty(item.name, `${label}[${index}].name`);
    if (ids.has(item.id)) throw new Error(`Duplicate item ID in ${label}: ${item.id}`);
    ids.add(item.id);
  }
}

function validateInformation(items, label) {
  const ids = new Set();
  for (const [index, item] of optionalList(items, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    exactFields(item, ['id', 'name', 'fields', 'multiple'], ['id', 'name'], itemLabel);
    id(item.id, `${itemLabel}.id`);
    nonEmpty(item.name, `${itemLabel}.name`);
    if (ids.has(item.id)) throw new Error(`Duplicate item ID in ${label}: ${item.id}`);
    ids.add(item.id);
    if ('multiple' in item) boolean(item.multiple, `${itemLabel}.multiple`);
    const fieldIds = new Set();
    for (const [fieldIndex, field] of optionalList(item.fields, `${itemLabel}.fields`).entries()) {
      const fieldLabel = `${itemLabel}.fields[${fieldIndex}]`;
      exactFields(field, ['id', 'name'], ['id', 'name'], fieldLabel);
      id(field.id, `${fieldLabel}.id`);
      nonEmpty(field.name, `${fieldLabel}.name`);
      if (fieldIds.has(field.id)) throw new Error(`Duplicate Information field ID in ${label}: ${item.id}.${field.id}`);
      fieldIds.add(field.id);
    }
  }
}

function validateComposition(owner, label, includedSubviewIds = []) {
  if (!('composition' in owner)) return;
  const groups = list(owner.composition, `${label}.composition`);
  if (!groups.length) throw new Error(`${label}.composition must not be empty`);
  const availableEntries = [
    ...(owner.actions || []).map(item => [item.id, 'action']),
    ...(owner.information || []).map(item => [item.id, 'information']),
    ...includedSubviewIds.map(item => [item, 'subview']),
  ];
  const available = new Map(availableEntries);
  if (available.size !== availableEntries.length) throw new Error(`Ambiguous Composition content ID in ${label}`);
  const groupIds = new Set();
  const occurrenceIds = new Set();
  const references = [];
  for (const [groupIndex, group] of groups.entries()) {
    const groupLabel = `${label}.composition[${groupIndex}]`;
    exactFields(group, ['id', 'content'], ['id', 'content'], groupLabel);
    id(group.id, `${groupLabel}.id`);
    if (groupIds.has(group.id)) throw new Error(`Duplicate Composition group ID in ${label}: ${group.id}`);
    groupIds.add(group.id);
    const content = list(group.content, `${groupLabel}.content`);
    if (!content.length) throw new Error(`${groupLabel}.content must not be empty`);
    for (const [contentIndex, entry] of content.entries()) {
      const contentLabel = `${groupLabel}.content[${contentIndex}]`;
      let ref;
      let occurrence = null;
      if (typeof entry === 'string') {
        ref = nonEmpty(entry, contentLabel);
      } else {
        exactFields(entry, ['id', 'ref'], ['id', 'ref'], contentLabel);
        occurrence = id(entry.id, `${contentLabel}.id`);
        ref = nonEmpty(entry.ref, `${contentLabel}.ref`);
      }
      const kind = available.get(ref);
      if (!kind) throw new Error(`Unknown Composition content reference in ${label}: ${ref}`);
      if (occurrence && kind !== 'information') throw new Error(`Explicit occurrence ID requires Information in ${label}: ${ref}`);
      const address = occurrence || ref;
      if (available.has(address) && occurrence) throw new Error(`Composition occurrence ID conflicts with content ID in ${label}: ${address}`);
      if (occurrenceIds.has(address)) throw new Error(`Duplicate Composition occurrence ID in ${label}: ${address}`);
      occurrenceIds.add(address);
      references.push({ref, kind, occurrence: Boolean(occurrence)});
    }
  }
  for (const [ref, kind] of available) {
    const matching = references.filter(item => item.ref === ref);
    if (!matching.length) throw new Error(`Composition omits ${kind} in ${label}: ${ref}`);
    if (kind !== 'information' && matching.length !== 1) throw new Error(`Composition duplicates ${kind} in ${label}: ${ref}`);
    if (kind === 'information' && matching.length > 1 && matching.some(item => !item.occurrence)) {
      throw new Error(`Repeated Information requires explicit occurrence IDs in ${label}: ${ref}`);
    }
  }
}

function validateLocalContentIdentity(owner, label) {
  const actionIds = new Set((owner.actions || []).map(item => item.id));
  for (const information of owner.information || []) {
    if (actionIds.has(information.id)) throw new Error(`Ambiguous Action/Information ID in ${label}: ${information.id}`);
  }
}

export function loadUiModel(sourceDirectory) {
  const source = parseYaml(path.join(sourceDirectory, 'ui.yaml'));
  exactFields(source, ['ui'], ['ui'], 'ui.yaml');
  const ui = mapping(source.ui, 'ui');
  exactFields(ui, ['subviews', 'views'], ['views'], 'ui');
  const subviews = optionalList(ui.subviews, 'ui.subviews');
  const views = list(ui.views, 'ui.views');
  const viewIds = new Set();
  const subviewIds = new Set();

  for (const [index, view] of views.entries()) {
    exactFields(view, ['id', 'name', 'includes', 'actions', 'information', 'navigation', 'composition'], ['id', 'name'], `ui.views[${index}]`);
    id(view.id, `ui.views[${index}].id`);
    nonEmpty(view.name, `ui.views[${index}].name`);
    if (viewIds.has(view.id)) throw new Error(`Duplicate View ID: ${view.id}`);
    viewIds.add(view.id);
  }
  for (const [index, subview] of subviews.entries()) {
    exactFields(subview, ['id', 'name', 'actions', 'information', 'navigation', 'composition'], ['id', 'name'], `ui.subviews[${index}]`);
    id(subview.id, `ui.subviews[${index}].id`);
    nonEmpty(subview.name, `ui.subviews[${index}].name`);
    if (subviewIds.has(subview.id) || viewIds.has(subview.id)) throw new Error(`Duplicate View/SubView ID: ${subview.id}`);
    subviewIds.add(subview.id);
  }

  for (const view of views) {
    validateActions(view.actions, `ui.view.${view.id}.actions`);
    validateInformation(view.information, `ui.view.${view.id}.information`);
    validateLocalContentIdentity(view, `ui.view.${view.id}`);
    const includes = optionalList(view.includes, `ui.view.${view.id}.includes`);
    if (new Set(includes).size !== includes.length) throw new Error(`Duplicate SubView include in View: ${view.id}`);
    for (const include of includes) if (!subviewIds.has(include)) throw new Error(`Unknown SubView include: ${include}`);
    validateComposition(view, `ui.view.${view.id}`, includes);
    for (const [index, navigation] of optionalList(view.navigation, `ui.view.${view.id}.navigation`).entries()) {
      exactFields(navigation, ['to'], ['to'], `ui.view.${view.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to) || navigation.to === view.id) throw new Error(`Invalid Navigation from View: ${view.id}`);
    }
  }
  for (const subview of subviews) {
    validateActions(subview.actions, `ui.subview.${subview.id}.actions`);
    validateInformation(subview.information, `ui.subview.${subview.id}.information`);
    validateLocalContentIdentity(subview, `ui.subview.${subview.id}`);
    validateComposition(subview, `ui.subview.${subview.id}`);
    for (const [index, navigation] of optionalList(subview.navigation, `ui.subview.${subview.id}.navigation`).entries()) {
      exactFields(navigation, ['to'], ['to'], `ui.subview.${subview.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to)) throw new Error(`Invalid Navigation from SubView: ${subview.id}`);
    }
  }

  const allRequirements = loadRequirements(sourceDirectory);
  const targets = new Set();
  for (const view of views) {
    targets.add(`ui.view.${view.id}`);
    for (const item of view.actions || []) targets.add(`ui.action.${view.id}.${item.id}`);
    for (const item of view.information || []) targets.add(`ui.info.${view.id}.${item.id}`);
  }
  for (const subview of subviews) {
    targets.add(`ui.subview.${subview.id}`);
    for (const item of subview.actions || []) targets.add(`ui.subview-action.${subview.id}.${item.id}`);
    for (const item of subview.information || []) targets.add(`ui.subview-info.${subview.id}.${item.id}`);
  }
  const requirements = requirementsForPrefix(allRequirements, 'ui.', targets, 'UI');
  return {ui: {subviews, views}, requirements};
}
