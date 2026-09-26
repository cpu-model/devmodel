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

function validateItems(items, label) {
  const ids = new Set();
  for (const [index, item] of list(items || [], label).entries()) {
    exactFields(item, ['id', 'name'], ['id', 'name'], `${label}[${index}]`);
    id(item.id, `${label}[${index}].id`);
    nonEmpty(item.name, `${label}[${index}].name`);
    if (ids.has(item.id)) throw new Error(`Duplicate item ID in ${label}: ${item.id}`);
    ids.add(item.id);
  }
}

export function loadUiModel(sourceDirectory) {
  const source = parseYaml(path.join(sourceDirectory, 'ui.yaml'));
  exactFields(source, ['ui'], ['ui'], 'ui.yaml');
  const ui = mapping(source.ui, 'ui');
  exactFields(ui, ['subviews', 'views'], ['views'], 'ui');
  const subviews = list(ui.subviews || [], 'ui.subviews');
  const views = list(ui.views, 'ui.views');
  const viewIds = new Set();
  const subviewIds = new Set();

  for (const [index, view] of views.entries()) {
    exactFields(view, ['id', 'name', 'includes', 'actions', 'information', 'navigation'], ['id', 'name'], `ui.views[${index}]`);
    id(view.id, `ui.views[${index}].id`);
    nonEmpty(view.name, `ui.views[${index}].name`);
    if (viewIds.has(view.id)) throw new Error(`Duplicate View ID: ${view.id}`);
    viewIds.add(view.id);
  }
  for (const [index, subview] of subviews.entries()) {
    exactFields(subview, ['id', 'name', 'actions', 'information', 'navigation'], ['id', 'name'], `ui.subviews[${index}]`);
    id(subview.id, `ui.subviews[${index}].id`);
    nonEmpty(subview.name, `ui.subviews[${index}].name`);
    if (subviewIds.has(subview.id) || viewIds.has(subview.id)) throw new Error(`Duplicate View/SubView ID: ${subview.id}`);
    subviewIds.add(subview.id);
  }

  for (const view of views) {
    validateItems(view.actions, `ui.view.${view.id}.actions`);
    validateItems(view.information, `ui.view.${view.id}.information`);
    const includes = list(view.includes || [], `ui.view.${view.id}.includes`);
    if (new Set(includes).size !== includes.length) throw new Error(`Duplicate SubView include in View: ${view.id}`);
    for (const include of includes) if (!subviewIds.has(include)) throw new Error(`Unknown SubView include: ${include}`);
    for (const [index, navigation] of list(view.navigation || [], `ui.view.${view.id}.navigation`).entries()) {
      exactFields(navigation, ['to'], ['to'], `ui.view.${view.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to) || navigation.to === view.id) throw new Error(`Invalid Navigation from View: ${view.id}`);
    }
  }
  for (const subview of subviews) {
    validateItems(subview.actions, `ui.subview.${subview.id}.actions`);
    validateItems(subview.information, `ui.subview.${subview.id}.information`);
    for (const [index, navigation] of list(subview.navigation || [], `ui.subview.${subview.id}.navigation`).entries()) {
      exactFields(navigation, ['to'], ['to'], `ui.subview.${subview.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to)) throw new Error(`Invalid Navigation from SubView: ${subview.id}`);
    }
  }

  const requirementsSource = parseYaml(path.join(sourceDirectory, 'requirements.yaml'));
  exactFields(requirementsSource, ['requirements'], ['requirements'], 'requirements.yaml');
  const allRequirements = mapping(requirementsSource.requirements, 'requirements');
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
  const requirements = {};
  for (const [target, values] of Object.entries(allRequirements)) {
    if (!target.startsWith('ui.')) continue;
    if (!targets.has(target)) throw new Error(`Unknown UI requirement target: ${target}`);
    list(values, `requirements.${target}`);
    if (!values.length) throw new Error(`requirements.${target} must not be empty`);
    requirements[target] = values.map((value, index) => nonEmpty(value, `requirements.${target}[${index}]`));
  }
  return {ui: {subviews, views}, requirements};
}
