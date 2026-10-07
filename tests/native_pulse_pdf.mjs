import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {layoutPulse} from '../tools/native/pulse_layout.mjs';
import {loadPulseModel} from '../tools/native/pulse_model.mjs';

const {parse, stringify} = createRequire(import.meta.url)('yaml');
const {PDFDocument, PDFName} = createRequire(import.meta.url)('pdf-lib');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'examples', 'model');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-v2-pulse-'));
for (const file of ['pulse.yaml', 'requirements.yaml']) fs.copyFileSync(path.join(example, file), path.join(directory, file));
const requirementDocument = parse(fs.readFileSync(path.join(directory, 'requirements.yaml'), 'utf8'));
requirementDocument.requirements['pulse.pulse.result-ready'] = [
  {id: 'retain-result-event-identity', text: 'The result ready event shall retain its identity.'},
  {id: 'order-result-event', text: 'The result ready event shall follow result establishment.'},
];
fs.writeFileSync(path.join(directory, 'requirements.yaml'), stringify(requirementDocument));

const debugRender = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_native_model.mjs'),
  '--source', example,
  '--out', path.join(directory, 'debug-render'),
  '--debug-pulse-layout',
], {encoding: 'utf8'});
assert.equal(debugRender.status, 0, debugRender.stderr);
assert.match(debugRender.stdout, /--- PULSE LAYOUT DEBUG ---/);
assert.match(debugRender.stdout, /"kind": "capability-flow"/);
assert.match(debugRender.stdout, /--- END PULSE LAYOUT DEBUG ---/);

const model = loadPulseModel(directory);
const layout = layoutPulse(model.pulse);
assert.deepEqual(layoutPulse(model.pulse), layout, 'Pulse projections and geometry are deterministic');
assert.equal(layout.pages.length, 3, 'Capability Flow overview plus one detail per declared Capability');
assert.equal(layout.pages[0].kind, 'capability-flow');
assert.deepEqual(layout.pages.slice(1).map(page => page.title), ['CAPABILITY: Input handling', 'CAPABILITY: Result presentation']);
assert.equal(layout.pages[0].domainNodes.length, 0, 'Overview excludes Domain Information');
assert.deepEqual(layout.pages[0].nodes.filter(node => node.kind === 'capability').map(node => node.id), ['input-handling', 'result-presentation']);
assert.equal(layout.pages[0].flows.length, 1, 'Capability Flow overview contains only its declared adjacent transition');
assert.equal(layout.pages[1].flows.length, 2, 'Source detail covers trigger and outgoing cross-Capability flow');
assert.equal(layout.pages[2].flows.length, 1, 'Destination detail covers incoming cross-Capability flow');
assert.match(layout.pages[1].nodes.find(node => node.kind === 'boundary').name, /^TO /);
assert.match(layout.pages[2].nodes.find(node => node.kind === 'boundary').name, /^FROM /);
assert.deepEqual(layout.pages.map(page => page.legend.map(item => item.display)), [[], ['01', '02'], ['02']], 'Capability Flow has no Pulse legend while details preserve global display identities');

const behaviorOccurrences = layout.pages.slice(1).flatMap(page => page.nodes.filter(node => node.kind === 'behavior'));
for (const behavior of behaviorOccurrences) {
  const incoming = layout.pages.flatMap(page => page.flows).filter(flow => flow.to === behavior.id);
  const outgoing = layout.pages.flatMap(page => page.flows).filter(flow => flow.from === behavior.id);
  assert.ok(incoming.every(flow => flow.points.at(-1).x === behavior.x), 'Incoming Pulse terminates on left side');
  assert.ok(incoming.every(flow => flow.points.at(-1).y >= behavior.y && flow.points.at(-1).y <= behavior.y + behavior.height), 'Incoming Pulse endpoint lies on the Behavior side');
  assert.ok(outgoing.every(flow => flow.points[0].x === behavior.x + behavior.width), 'Outgoing Pulse starts on right side');
}
for (const page of layout.pages.slice(1)) {
  assert.equal(page.domainNodes.length, 0, 'Domain Information has no standalone nodes');
  assert.equal(page.informationFlows.length, 0, 'Domain Information has no connector geometry');
  for (const behavior of page.nodes.filter(node => node.kind === 'behavior')) {
    assert.ok(Array.isArray(behavior.informationIn), 'Behavior carries its upper Domain Information entries');
    assert.ok(Array.isArray(behavior.informationOut), 'Behavior carries its lower Domain Information entries');
  }
}
const processedResultOccurrences = layout.pages.slice(1)
  .flatMap(page => page.nodes.filter(node => node.kind === 'behavior'))
  .flatMap(node => [...node.informationIn, ...node.informationOut])
  .filter(item => item.id === 'processed-result');
assert.equal(processedResultOccurrences.length, 2, 'Domain Information repeats inside each participating Behavior');


const coveragePulse = {
  capabilities: [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}], 'domain-information': [],
  behaviors: [{id: 'a1', name: 'A1', capability: 'a'}, {id: 'a2', name: 'A2', capability: 'a'}, {id: 'b1', name: 'B1', capability: 'b'}],
  pulses: [{id: 'p1', display: '1', name: 'P1'}, {id: 'p2', display: '2', name: 'P2'}, {id: 'p3', display: '3', name: 'P3'}],
  flows: [{trigger: 'Start', pulse: 'p1', to: 'a1'}, {from: 'a1', pulse: 'p2', to: 'a2'}, {from: 'a2', pulse: 'p3', to: 'b1'}],
};
const largePulse = {
  capabilities: [{id: 'large', name: 'Large'}], 'domain-information': [],
  behaviors: Array.from({length: 16}, (_, index) => ({id: `b${index}`, name: `B${index}`, capability: 'large'})),
  pulses: Array.from({length: 16}, (_, index) => ({id: `p${index}`, display: String(index + 1), name: `P${index}`})),
  flows: Array.from({length: 16}, (_, index) => ({trigger: `T${index}`, pulse: `p${index}`, to: `b${index}`})),
};
const largeStart = performance.now();
const largeLayout = layoutPulse(largePulse);
assert.ok(performance.now() - largeStart < 2000, 'Large Pulse projection avoids combinatorial order search');
assert.equal(largeLayout.pages[0].flows.length, 16);

const fanoutPulse = {
  capabilities: [{id: 'fanout', name: 'Fanout'}], 'domain-information': [],
  behaviors: [
    {id: 'source', name: 'Source', capability: 'fanout'},
    ...Array.from({length: 8}, (_, index) => ({id: `target${index}`, name: `Target ${index}`, capability: 'fanout'})),
  ],
  pulses: Array.from({length: 9}, (_, index) => ({id: `fp${index}`, display: String(index + 1), name: `FP${index}`})),
  flows: [
    {trigger: 'Start', pulse: 'fp0', to: 'source'},
    ...Array.from({length: 8}, (_, index) => ({from: 'source', pulse: `fp${index + 1}`, to: `target${index}`})),
  ],
};
const fanoutStart = performance.now();
const fanoutLayout = layoutPulse(fanoutPulse);
assert.ok(performance.now() - fanoutStart < 2000, 'Large fan-out avoids factorial/exponential port search');
assert.equal(fanoutLayout.pages[0].flows.length, 9);

const coverage = layoutPulse(coveragePulse).pages;
assert.equal(coverage.length, 2, 'No overview is generated without a declared Capability Flow');
assert.equal(coverage[0].flows.length, 3, 'Source detail covers trigger, internal, and outgoing cross-Capability flows');
assert.equal(coverage[1].flows.length, 1, 'Destination detail covers only incoming cross-Capability flow');

const capabilitySourcePulse = {
  capabilities: [{id: 'source', name: 'Source'}, {id: 'detail', name: 'Detail'}],
  'domain-information': [{id: 'state', name: 'State'}],
  behaviors: [
    {id: 'source-a', name: 'Source A', capability: 'source'},
    {id: 'source-b', name: 'Source B', capability: 'source'},
    {id: 'detail-a', name: 'Detail A', capability: 'detail', 'information-out': ['state']},
    {id: 'detail-b', name: 'Detail B', capability: 'detail', 'information-out': ['state']},
    {id: 'detail-c', name: 'Detail C', capability: 'detail', 'information-in': ['state']},
    {id: 'detail-d', name: 'Detail D', capability: 'detail', 'information-in': ['state']},
  ],
  pulses: Array.from({length: 6}, (_, index) => ({id: `cp-${index}`, display: `${index + 1}`, name: `CP ${index + 1}`})),
  flows: [
    {trigger: 'External A', pulse: 'cp-0', to: 'detail-a'},
    {trigger: 'External B', pulse: 'cp-1', to: 'detail-b'},
    {from: 'source-a', pulse: 'cp-2', to: 'detail-c'},
    {from: 'source-b', pulse: 'cp-3', to: 'detail-d'},
    {from: 'detail-a', pulse: 'cp-4', to: 'detail-c'},
    {from: 'detail-b', pulse: 'cp-5', to: 'detail-d'},
  ],
};
const capabilitySourcePage = layoutPulse(capabilitySourcePulse).pages.find(page => page.title === 'CAPABILITY: Detail');
const leftSources = capabilitySourcePage.nodes.filter(node => node.kind === 'trigger' || (node.kind === 'boundary' && /^FROM /.test(node.name)));
assert.equal(leftSources.length, 4, 'Capability detail preserves every external and cross-Capability source occurrence');
for (const source of leftSources) {
  const sourceFlows = capabilitySourcePage.flows.filter(flow =>
    ('trigger' in flow ? `trigger:${flow.trigger}` : flow.from) === source.id);
  assert.ok(sourceFlows.length > 0, `Capability source ${source.name} has an outgoing Pulse`);
  for (const flow of sourceFlows) {
    assert.equal(flow.points[0].x, source.x + source.width, `Capability source ${source.name} connects at its right edge`);
    const verticalExtent = {
      source: {id: source.id, kind: source.kind, name: source.name, y: source.y, height: source.height, top: source.y + source.height},
      connector: {x: flow.points[0].x, y: flow.points[0].y},
      flow: {sourceKind: 'trigger' in flow ? 'trigger' : 'from', source: 'trigger' in flow ? flow.trigger : flow.from, pulse: flow.pulse, to: flow.to},
    };
    assert.ok(flow.points[0].y >= source.y && flow.points[0].y <= source.y + source.height,
      `Capability source connector starts within visible vertical extent: ${JSON.stringify(verticalExtent)}`);
    assert.equal(flow.points[1].y, flow.points[0].y,
      `Capability source ${source.name} connector leaves horizontally`);
  }
}


// Every final causal connector must remain attached to the visible source and
// destination nodes after all projection, packing, routing, and normalization.
for (const page of layoutPulse(capabilitySourcePulse).pages) {
  const nodes = new Map(page.nodes.map(node => [node.id, node]));
  for (const flow of page.flows) {
    const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
    const source = nodes.get(sourceId);
    const target = nodes.get(flow.to);
    assert.ok(source, `${page.title}: source ${sourceId} is visible`);
    assert.ok(target, `${page.title}: target ${flow.to} is visible`);
    assert.equal(flow.points[0].x, source.x + source.width,
      `${page.title}: ${flow.pulse} starts on source right side`);
    if ('trigger' in flow) {
      assert.equal(flow.points[0].y, source.y + source.height / 2,
        `${page.title}: ${flow.pulse} leaves Trigger at its right vertex`);
    }
    assert.ok(flow.points[0].y >= source.y && flow.points[0].y <= source.y + source.height,
      `${page.title}: ${flow.pulse} starts within source vertical extent`);
    assert.equal(flow.points.at(-1).x, target.x,
      `${page.title}: ${flow.pulse} ends on target left side`);
    assert.ok(flow.points.at(-1).y >= target.y && flow.points.at(-1).y <= target.y + target.height,
      `${page.title}: ${flow.pulse} ends within target vertical extent`);
  }
}


const simpleFlow = layout.pages[0];
assert.deepEqual(simpleFlow.nodes.map(node => node.id), ['input-handling', 'result-presentation'],
  'Capability Flow preserves declared Capability order');
assert.deepEqual(simpleFlow.flows.map(flow => [flow.from, flow.to]), [['input-handling', 'result-presentation']],
  'Capability Flow renders exactly one connector per adjacent declared step');
assert.equal(simpleFlow.flows[0].points.length, 2, 'Simple Capability Flow connector needs no routing bends');

const output = path.join(directory, 'pulse.pdf');
const result = spawnSync(process.execPath, [path.join(root, 'tools', 'render_pulse_native.mjs'), '--source', directory, '--output', output], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
const source = fs.readFileSync(output, 'latin1');
assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 3);
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 5, 'Every requirement-addressable detail occurrence is annotated and the Capability Flow overview adds none');
assert.doesNotMatch(source, /<svg|\/Image\b/);
const pdf = await PDFDocument.load(fs.readFileSync(output));
const pulseContents = pdf.getPages().flatMap(page => page.node.Annots().asArray().map(reference => pdf.context.lookup(reference)))
  .filter(annotation => annotation.get(PDFName.of('Subtype'))?.toString() === '/Text')
  .map(annotation => annotation.get(PDFName.of('Contents')).decodeText());
assert.equal(pulseContents.filter(text => text === 'The result ready event shall retain its identity.\n\nThe result ready event shall follow result establishment.').length, 2, 'Pulse requirements occur only in the two complete Capability details, not in the Capability Flow overview');

const systemPulse = {
  'domain-information': [{id: 'input', name: 'Input'}],
  behaviors: [{id: 'handle', name: 'Handle', 'information-in': ['input']}],
  pulses: [{id: 'start', display: 'A', name: 'Start'}], flows: [{trigger: 'Start', pulse: 'start', to: 'handle'}],
};
const systemLayout = layoutPulse(systemPulse);
assert.equal(systemLayout.pages.length, 1);
assert.equal(systemLayout.pages[0].kind, 'system');
const systemDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-v2-system-pulse-'));
const systemDocument = parse(fs.readFileSync(path.join(example, 'pulse.yaml'), 'utf8'));
delete systemDocument.pulse.capabilities;
delete systemDocument.pulse['capability-flows'];
systemDocument.pulse.behaviors.forEach(behavior => { delete behavior.capability; });
fs.writeFileSync(path.join(systemDirectory, 'pulse.yaml'), stringify(systemDocument));
fs.copyFileSync(path.join(example, 'requirements.yaml'), path.join(systemDirectory, 'requirements.yaml'));
const systemOutput = path.join(systemDirectory, 'pulse.pdf');
const systemResult = spawnSync(process.execPath, [path.join(root, 'tools', 'render_pulse_native.mjs'), '--source', systemDirectory, '--output', systemOutput], {encoding: 'utf8'});
assert.equal(systemResult.status, 0, systemResult.stderr);
const systemPdf = await PDFDocument.load(fs.readFileSync(systemOutput));
assert.equal(systemPdf.getPageCount(), 1, 'Pulse without Capabilities renders one integrated system page');

const stressPulse = {
  'domain-information': Array.from({length: 6}, (_, index) => ({id: `info-${index}`, name: `Information ${index}`})),
  behaviors: Array.from({length: 7}, (_, index) => ({id: `behavior-${index}`, name: `Behavior ${index}`, 'information-in': index ? [`info-${index - 1}`] : [], 'information-out': index < 6 ? [`info-${index}`] : []})),
  pulses: Array.from({length: 7}, (_, index) => ({id: `pulse-${index}`, display: `${index + 1}`, name: `Pulse ${index + 1}`})),
  flows: [{trigger: 'Start', pulse: 'pulse-0', to: 'behavior-0'}, ...Array.from({length: 6}, (_, index) => ({from: `behavior-${index}`, pulse: `pulse-${index + 1}`, to: `behavior-${index + 1}`}))],
};
const stress = layoutPulse(stressPulse).pages[0];
assert.equal(stress.domainNodes.length, 0, 'Stress layout has no standalone Domain Information nodes');
assert.equal(stress.informationFlows.length, 0, 'Stress layout has no Domain Information connectors');
assert.equal(stress.nodes.filter(node => node.kind === 'behavior')
  .flatMap(node => [...node.informationIn, ...node.informationOut]).length, 12,
  'Stress layout preserves all Domain Information occurrences inside Behaviors');
assert.ok(stress.flows.every(flow => flow.points.slice(1).every((point, index) => point.x === flow.points[index].x || point.y === flow.points[index].y)), 'Stress routes remain orthogonal');
console.log('CPU v2 Pulse projection, layout, PDF, annotation, and stress checks passed');
