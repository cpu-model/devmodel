import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadUiModel} from '../tools/native/ui_model.mjs';
import {loadPresentationModel} from '../tools/native/presentation_model.mjs';

const {stringify} = createRequire(import.meta.url)('yaml');

function directory(ui, presentation = undefined) {
  const result = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-presentation-'));
  fs.writeFileSync(path.join(result, 'ui.yaml'), stringify({ui}));
  fs.writeFileSync(path.join(result, 'requirements.yaml'), 'requirements: {}\n');
  if (presentation) fs.writeFileSync(path.join(result, 'presentation.yaml'), stringify({presentation}));
  fs.mkdirSync(path.join(result, 'assets'));
  fs.writeFileSync(path.join(result, 'assets', 'visual.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
  fs.writeFileSync(path.join(result, 'outside.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
  return result;
}

function clone(value) {
  return structuredClone(value);
}

function validate(ui, presentation) {
  const source = directory(ui, presentation);
  try {
    const model = loadUiModel(source);
    return {ui: model.ui, presentation: loadPresentationModel(source, model.ui)};
  } finally {
    fs.rmSync(source, {recursive: true, force: true});
  }
}

function invalid(ui, presentation, expected) {
  assert.throws(() => validate(ui, presentation), expected);
}

const ui = {
  subviews: [
    {id: 'navigation', name: 'Navigation', navigation: [{to: 'planning'}, {to: 'charging'}]},
    {
      id: 'charging-status', name: 'Charging status',
      information: [{id: 'vehicle-soc', name: 'Vehicle SoC', fields: [{id: 'value', name: 'Value'}, {id: 'observed-at', name: 'Observed at'}]}],
      composition: [{id: 'status', content: ['vehicle-soc']}],
    },
  ],
  views: [
    {
      id: 'planning', name: 'Planning', includes: ['navigation', 'charging-status'],
      information: [{id: 'charging-options', name: 'Charging options', multiple: true, fields: [{id: 'cost', name: 'Cost'}]}],
      actions: [{id: 'select-charging', name: 'Select charging'}],
      composition: [
        {id: 'header', content: ['navigation', 'charging-status']},
        {id: 'workspace', content: ['charging-options', 'select-charging']},
      ],
    },
    {
      id: 'charging', name: 'Charging', includes: ['navigation', 'charging-status'],
      information: [{id: 'commanded-state', name: 'Commanded state'}],
      composition: [
        {id: 'header', content: ['navigation', 'charging-status']},
        {id: 'workspace', content: ['commanded-state']},
      ],
    },
  ],
};

const presentation = {
  timezone: {source: 'site'},
  resources: [
    {id: 'workspace-image', path: 'assets/visual.svg'},
    {id: 'application-icon', path: 'assets/visual.svg'},
  ],
  'resource-uses': [
    {resource: 'workspace-image', role: 'decorative', view: 'planning'},
    {resource: 'workspace-image', role: 'identity', subview: 'charging-status'},
    {resource: 'workspace-image', role: 'information-representation', view: 'planning', ref: 'charging-options.cost'},
    {resource: 'application-icon', role: 'installation'},
  ],
  'shared-layouts': [{
    id: 'charging-workspace', views: ['planning', 'charging'],
    regions: [
      {ref: 'header', direction: 'horizontal', continuity: true},
      {ref: 'workspace', direction: 'vertical', wrap: true},
    ],
  }],
  subviews: [{
    ref: 'charging-status', layout: {direction: 'horizontal', wrap: true},
    representations: [
      {ref: 'vehicle-soc.value', as: 'radial-progress', emphasis: 'primary'},
      {ref: 'vehicle-soc.observed-at', as: 'labeled-values'},
    ],
  }],
  views: [{
    ref: 'planning', representations: [
      {ref: 'charging-options.cost', as: 'line-chart'},
      {ref: 'select-charging', as: 'chart-selection', on: 'charging-options.cost'},
    ],
  }],
};

// Existing CPU models remain valid without either optional extension.
const legacyUi = {views: [{id: 'main', name: 'Main', information: [{id: 'status', name: 'Status'}]}]};
assert.equal(validate(legacyUi).presentation, null);

// Valid Composition, fields, Presentation and continuous Shared Layout.
assert.equal(validate(ui, presentation).presentation.timezone.source, 'site');
assert.equal(validate(ui, presentation).presentation.resources[0].id, 'workspace-image');

// Repeated Information requires and accepts explicit stable occurrence IDs.
const repeated = clone(ui);
repeated.views[0].composition[1].content = [
  {id: 'cost-chart', ref: 'charging-options'},
  {id: 'savings-chart', ref: 'charging-options'},
  'select-charging',
];
const repeatedPresentation = clone(presentation);
repeatedPresentation.views[0].representations = [
  {ref: 'cost-chart.cost', as: 'line-chart'},
  {ref: 'savings-chart', as: 'table'},
  {ref: 'select-charging', as: 'chart-selection', on: 'cost-chart.cost'},
];
repeatedPresentation['resource-uses'][2].ref = 'cost-chart.cost';
validate(repeated, repeatedPresentation);

// Explicit time-zone policy accepts a real IANA zone.
const explicit = clone(presentation);
explicit.timezone = {source: 'explicit', zone: 'Europe/Stockholm'};
validate(ui, explicit);
const client = clone(presentation);
client.timezone = {source: 'client'};
validate(ui, client);

for (const [mutate, expected] of [
  [p => { p.views[0].ref = 'missing'; }, /Unknown Presentation View reference/],
  [p => { p.subviews[0].ref = 'missing'; }, /Unknown Presentation SubView reference/],
  [p => { p.views[0].representations[0].ref = 'missing-information'; }, /Unknown Presentation content reference/],
  [p => { p.views[0].representations[1].ref = 'missing-action'; }, /Unknown Presentation content reference/],
  [p => { p.views[0].representations[0].ref = 'charging-options.missing'; }, /Unknown Presentation field reference/],
  [p => { p['shared-layouts'][0].regions[0].ref = 'missing-group'; }, /Unknown Composition group/],
  [p => { p.views[0].representations[0].ref = 'commanded-state'; }, /Unknown Presentation content reference/],
  [p => { p.views[0].representations.push({...p.views[0].representations[0]}); }, /Duplicate Presentation representation/],
  [p => { p.views[0].representations.push({ref: 'charging-options', as: 'table'}); }, /Conflicting Presentation representations/],
  [p => { delete p.views[0].representations[1].on; }, /chart-selection requires on/],
  [p => { p.views[0].representations[1].on = 'select-charging'; }, /on must reference an Information representation/],
  [p => { p.views[0].representations[0].as = 'pie-chart'; }, /Invalid Presentation representation/],
  [p => { p.views[0].representations[0].emphasis = 'urgent'; }, /Invalid Presentation emphasis/],
  [p => { p['shared-layouts'][0].regions[0].direction = 'diagonal'; }, /Invalid Presentation direction/],
  [p => { p.views.push(clone(p.views[0])); }, /Duplicate Presentation View definition/],
  [p => { p.timezone = {source: 'browser'}; }, /Invalid Presentation timezone source/],
  [p => { p.timezone = {source: 'explicit', zone: 'Not\/A-Zone'}; }, /Invalid explicit Presentation timezone/],
  [p => { p.timezone = {source: 'client', zone: 'UTC'}; }, /zone is allowed only/],
  [p => { p.resources.push({...p.resources[0]}); }, /Duplicate Presentation resource ID/],
  [p => { p['resource-uses'] = p['resource-uses'].filter(use => use.resource !== 'application-icon'); }, /Unused Presentation resource declaration/],
  [p => { p['resource-uses'].push({...p['resource-uses'][0]}); }, /Duplicate Presentation resource use/],
  [p => { p.resources[0].path = 'assets/missing.svg'; }, /resource file does not exist/],
  [p => { p.resources[0].path = '../outside.svg'; }, /path must be relative under assets/],
  [p => { p['resource-uses'][0].resource = 'missing'; }, /Unknown Presentation resource reference/],
  [p => { p['resource-uses'][0].view = 'missing'; }, /Unknown Presentation View resource-use reference/],
  [p => { p['resource-uses'][2].ref = 'select-charging'; }, /ref must resolve to Information/],
  [p => { p['resource-uses'][3].view = 'planning'; }, /installation resource use must not reference UI/],
  [p => { p.resources[0].text = 'New functional content'; }, /unknown \[text\]/],
  [p => { p.views[0].unexpected = true; }, /unknown \[unexpected\]/],
]) {
  const candidate = clone(presentation);
  mutate(candidate);
  invalid(ui, candidate, expected);
}

const escapingSymlink = directory(ui, presentation);
try {
  fs.symlinkSync(path.join(escapingSymlink, 'outside.svg'), path.join(escapingSymlink, 'assets', 'escape.svg'));
  const candidate = clone(presentation);
  candidate.resources[0].path = 'assets/escape.svg';
  fs.writeFileSync(path.join(escapingSymlink, 'presentation.yaml'), stringify({presentation: candidate}));
  const model = loadUiModel(escapingSymlink);
  assert.throws(() => loadPresentationModel(escapingSymlink, model.ui), /path leaves assets/);
} finally {
  fs.rmSync(escapingSymlink, {recursive: true, force: true});
}

const invalidOccurrence = clone(ui);
invalidOccurrence.views[0].composition[1].content = ['charging-options', {id: 'second', ref: 'charging-options'}, 'select-charging'];
invalid(invalidOccurrence, presentation, /Repeated Information requires explicit occurrence IDs/);

const duplicateGroup = clone(ui);
duplicateGroup.views[0].composition.push(clone(duplicateGroup.views[0].composition[0]));
invalid(duplicateGroup, presentation, /Duplicate Composition group ID/);

const duplicateField = clone(ui);
duplicateField.views[0].information[0].fields.push(clone(duplicateField.views[0].information[0].fields[0]));
invalid(duplicateField, presentation, /Duplicate Information field ID/);

const duplicateOccurrence = clone(repeated);
duplicateOccurrence.views[0].composition[1].content[1].id = 'cost-chart';
invalid(duplicateOccurrence, repeatedPresentation, /Duplicate Composition occurrence ID/);

const ambiguousContent = clone(ui);
ambiguousContent.views[0].actions[0].id = 'charging-options';
invalid(ambiguousContent, presentation, /Ambiguous Action\/Information ID/);

const unknownContent = clone(ui);
unknownContent.views[0].composition[1].content[0] = 'missing';
invalid(unknownContent, presentation, /Unknown Composition content reference/);

const omittedContent = clone(ui);
omittedContent.views[0].composition[1].content = ['charging-options'];
invalid(omittedContent, presentation, /Composition omits action/);

const actionOccurrence = clone(ui);
actionOccurrence.views[0].composition[1].content[1] = {id: 'selector', ref: 'select-charging'};
invalid(actionOccurrence, presentation, /Explicit occurrence ID requires Information/);

const invalidMultiple = clone(ui);
invalidMultiple.views[0].information[0].multiple = 'yes';
invalid(invalidMultiple, presentation, /multiple must be a boolean/);

const unknownOccurrence = clone(presentation);
unknownOccurrence.views[0].representations[0].ref = 'missing-occurrence.cost';
invalid(repeated, unknownOccurrence, /Unknown Presentation field reference/);

const incompatible = clone(ui);
incompatible.views[1].composition[0].content.reverse();
invalid(incompatible, presentation, /Incompatible continuous Shared Layout region/);

const competingOrder = clone(presentation);
competingOrder['shared-layouts'][0].regions.reverse();
invalid(ui, competingOrder, /region order must equal UI Composition order/);

const conflictingSharedLayout = clone(presentation);
conflictingSharedLayout['shared-layouts'].push({
  id: 'duplicate-workspace',
  views: ['planning', 'charging'],
  regions: clone(conflictingSharedLayout['shared-layouts'][0].regions),
});
invalid(ui, conflictingSharedLayout, /Conflicting Shared Layout definition/);

const unknownUiField = clone(ui);
unknownUiField.views[0].layout = 'horizontal';
invalid(unknownUiField, presentation, /unknown \[layout\]/);

const duplicateYaml = directory(ui);
try {
  fs.writeFileSync(path.join(duplicateYaml, 'presentation.yaml'), `presentation:\n  timezone: {source: site}\n  timezone: {source: client}\n`);
  const model = loadUiModel(duplicateYaml);
  assert.throws(() => loadPresentationModel(duplicateYaml, model.ui), /Map keys must be unique/);
} finally {
  fs.rmSync(duplicateYaml, {recursive: true, force: true});
}

console.log('CPU Presentation v1 validation checks PASS');
