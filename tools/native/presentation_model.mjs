import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');
const directions = new Set(['horizontal', 'vertical']);
const emphases = new Set(['primary', 'secondary', 'subdued']);
const informationRepresentations = new Set([
  'radial-progress', 'labeled-values', 'status-indicators', 'line-chart', 'bar-chart', 'table',
]);
const actionRepresentations = new Set(['chart-selection']);

function mapping(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  return value;
}

function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}

function optionalList(value, label) {
  return list(value === undefined ? [] : value, label);
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

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
  return value;
}

function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

function ownerScope(owner) {
  const direct = new Map([
    ...(owner.actions || []).map(item => [item.id, {kind: 'action', item}]),
    ...(owner.information || []).map(item => [item.id, {kind: 'information', item}]),
  ]);
  if (!owner.composition) return direct;
  const composed = new Map();
  for (const group of owner.composition) {
    for (const entry of group.content) {
      const ref = typeof entry === 'string' ? entry : entry.ref;
      const address = typeof entry === 'string' ? entry : entry.id;
      if (direct.has(ref)) composed.set(address, direct.get(ref));
    }
  }
  return composed;
}

function resolveRepresentationRef(ref, scope, label) {
  nonEmpty(ref, label);
  if (scope.has(ref)) return {...scope.get(ref), address: ref, field: null};
  const separator = ref.lastIndexOf('.');
  if (separator < 1 || separator === ref.length - 1) throw new Error(`Unknown Presentation content reference: ${ref}`);
  const address = ref.slice(0, separator);
  const field = ref.slice(separator + 1);
  const target = scope.get(address);
  if (!target || target.kind !== 'information') throw new Error(`Unknown Presentation field reference: ${ref}`);
  const fields = new Set((target.item.fields || []).map(item => item.id));
  if (!fields.has(field)) throw new Error(`Unknown Presentation field reference: ${ref}`);
  return {...target, address, field};
}

function validateLayout(value, label) {
  exactFields(value, ['direction', 'wrap'], ['direction'], label);
  if (!directions.has(value.direction)) throw new Error(`Invalid Presentation direction: ${value.direction}`);
  if ('wrap' in value) boolean(value.wrap, `${label}.wrap`);
}

function validateRepresentations(value, owner, label) {
  const representations = optionalList(value, label);
  const scope = ownerScope(owner);
  const resolved = new Map();
  const fullInformation = new Set();
  const fieldInformation = new Set();
  for (const [index, representation] of representations.entries()) {
    const itemLabel = `${label}[${index}]`;
    exactFields(representation, ['ref', 'as', 'emphasis', 'on'], ['ref', 'as'], itemLabel);
    const target = resolveRepresentationRef(representation.ref, scope, `${itemLabel}.ref`);
    if (resolved.has(representation.ref)) throw new Error(`Duplicate Presentation representation: ${representation.ref}`);
    resolved.set(representation.ref, target);
    nonEmpty(representation.as, `${itemLabel}.as`);
    const allowed = target.kind === 'information' ? informationRepresentations : actionRepresentations;
    if (!allowed.has(representation.as)) throw new Error(`Invalid Presentation representation for ${target.kind}: ${representation.as}`);
    if ('emphasis' in representation && !emphases.has(representation.emphasis)) {
      throw new Error(`Invalid Presentation emphasis: ${representation.emphasis}`);
    }
    if (target.kind === 'information') {
      if (target.field) fieldInformation.add(target.address);
      else fullInformation.add(target.address);
    }
    if (representation.as === 'chart-selection') {
      if (!('on' in representation)) throw new Error(`${itemLabel}: chart-selection requires on`);
    } else if ('on' in representation) throw new Error(`${itemLabel}: on is allowed only for chart-selection`);
  }
  for (const address of fullInformation) {
    if (fieldInformation.has(address)) throw new Error(`Conflicting Presentation representations for Information: ${address}`);
  }
  for (const [index, representation] of representations.entries()) {
    if (representation.as !== 'chart-selection') continue;
    nonEmpty(representation.on, `${label}[${index}].on`);
    const anchor = resolved.get(representation.on);
    if (!anchor || anchor.kind !== 'information') {
      throw new Error(`Presentation on must reference an Information representation in the same scope: ${representation.on}`);
    }
  }
}

function validatePresentationOwners(entries, owners, kind) {
  const seen = new Set();
  for (const [index, entry] of optionalList(entries, `presentation.${kind}s`).entries()) {
    const label = `presentation.${kind}s[${index}]`;
    const allowed = kind === 'subview' ? ['ref', 'layout', 'representations'] : ['ref', 'representations'];
    exactFields(entry, allowed, ['ref'], label);
    id(entry.ref, `${label}.ref`);
    const owner = owners.get(entry.ref);
    if (!owner) throw new Error(`Unknown Presentation ${kind === 'subview' ? 'SubView' : 'View'} reference: ${entry.ref}`);
    if (seen.has(entry.ref)) throw new Error(`Duplicate Presentation ${kind === 'subview' ? 'SubView' : 'View'} definition: ${entry.ref}`);
    seen.add(entry.ref);
    if ('layout' in entry) validateLayout(entry.layout, `${label}.layout`);
    validateRepresentations(entry.representations, owner, `${label}.representations`);
  }
}

function compositionGroups(view) {
  return new Map((view.composition || []).map(group => [group.id, group]));
}

function groupSubviewOrder(group, subviewIds) {
  return group.content
    .map(entry => typeof entry === 'string' ? entry : entry.ref)
    .filter(ref => subviewIds.has(ref));
}

function validateSharedLayouts(layouts, views, subviewIds) {
  const layoutIds = new Set();
  const claimedRegions = new Set();
  for (const [index, layout] of optionalList(layouts, 'presentation.shared-layouts').entries()) {
    const label = `presentation.shared-layouts[${index}]`;
    exactFields(layout, ['id', 'views', 'regions'], ['id', 'views', 'regions'], label);
    id(layout.id, `${label}.id`);
    if (layoutIds.has(layout.id)) throw new Error(`Duplicate Shared Layout ID: ${layout.id}`);
    layoutIds.add(layout.id);
    const refs = list(layout.views, `${label}.views`);
    if (refs.length < 2) throw new Error(`${label}.views must contain at least two Views`);
    if (new Set(refs).size !== refs.length) throw new Error(`Duplicate View in Shared Layout: ${layout.id}`);
    const selectedViews = refs.map((ref, viewIndex) => {
      nonEmpty(ref, `${label}.views[${viewIndex}]`);
      const view = views.get(ref);
      if (!view) throw new Error(`Unknown View in Shared Layout: ${ref}`);
      if (!view.composition) throw new Error(`Shared Layout View lacks Composition: ${ref}`);
      return view;
    });
    const regions = list(layout.regions, `${label}.regions`);
    if (!regions.length) throw new Error(`${label}.regions must not be empty`);
    const regionRefs = [];
    for (const [regionIndex, region] of regions.entries()) {
      const regionLabel = `${label}.regions[${regionIndex}]`;
      exactFields(region, ['ref', 'direction', 'wrap', 'continuity'], ['ref', 'direction'], regionLabel);
      id(region.ref, `${regionLabel}.ref`);
      if (regionRefs.includes(region.ref)) throw new Error(`Duplicate Shared Layout region: ${layout.id}.${region.ref}`);
      regionRefs.push(region.ref);
      if (!directions.has(region.direction)) throw new Error(`Invalid Presentation direction: ${region.direction}`);
      if ('wrap' in region) boolean(region.wrap, `${regionLabel}.wrap`);
      if ('continuity' in region) boolean(region.continuity, `${regionLabel}.continuity`);
      for (const view of selectedViews) {
        if (!compositionGroups(view).has(region.ref)) throw new Error(`Unknown Composition group in Shared Layout View ${view.id}: ${region.ref}`);
        const claim = `${view.id}.${region.ref}`;
        if (claimedRegions.has(claim)) throw new Error(`Conflicting Shared Layout definition for View region: ${claim}`);
        claimedRegions.add(claim);
      }
      if (region.continuity === true) {
        const orders = selectedViews.map(view => groupSubviewOrder(compositionGroups(view).get(region.ref), subviewIds));
        if (!orders[0].length || orders.some(order => JSON.stringify(order) !== JSON.stringify(orders[0]))) {
          throw new Error(`Incompatible continuous Shared Layout region: ${layout.id}.${region.ref}`);
        }
      }
    }
    for (const view of selectedViews) {
      const declaredOrder = view.composition.map(group => group.id);
      if (JSON.stringify(regionRefs) !== JSON.stringify(declaredOrder)) {
        throw new Error(`Shared Layout region order must equal UI Composition order for View: ${view.id}`);
      }
    }
  }
}

function validateTimezone(value) {
  exactFields(value, ['source', 'zone'], ['source'], 'presentation.timezone');
  if (!['site', 'client', 'explicit'].includes(value.source)) throw new Error(`Invalid Presentation timezone source: ${value.source}`);
  if (value.source === 'explicit') {
    nonEmpty(value.zone, 'presentation.timezone.zone');
    try {
      new Intl.DateTimeFormat('en', {timeZone: value.zone}).format();
    } catch {
      throw new Error(`Invalid explicit Presentation timezone: ${value.zone}`);
    }
  } else if ('zone' in value) throw new Error(`presentation.timezone.zone is allowed only when source is explicit`);
}

export function loadPresentationModel(sourceDirectory, ui) {
  const filename = path.join(sourceDirectory, 'presentation.yaml');
  if (!fs.existsSync(filename)) return null;
  const source = parseYaml(filename);
  exactFields(source, ['presentation'], ['presentation'], 'presentation.yaml');
  const presentation = mapping(source.presentation, 'presentation');
  exactFields(presentation, ['timezone', 'shared-layouts', 'subviews', 'views'], ['timezone'], 'presentation');
  validateTimezone(presentation.timezone);
  const views = new Map(ui.views.map(view => [view.id, view]));
  const subviews = new Map(ui.subviews.map(subview => [subview.id, subview]));
  validatePresentationOwners(presentation.subviews, subviews, 'subview');
  validatePresentationOwners(presentation.views, views, 'view');
  validateSharedLayouts(presentation['shared-layouts'], views, new Set(subviews.keys()));
  return presentation;
}
