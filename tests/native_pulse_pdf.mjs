import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {layoutPulse, PULSE_RADIUS} from '../tools/native/pulse_layout.mjs';
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
assert.match(debugRender.stdout, /"kind": "overview"/);
assert.match(debugRender.stdout, /--- END PULSE LAYOUT DEBUG ---/);

const model = loadPulseModel(directory);
const layout = layoutPulse(model.pulse);
assert.deepEqual(layoutPulse(model.pulse), layout, 'Pulse projections and geometry are deterministic');
assert.equal(layout.pages.length, 3, 'Overview plus one detail per declared Capability');
assert.equal(layout.pages[0].kind, 'overview');
assert.deepEqual(layout.pages.slice(1).map(page => page.title), ['CAPABILITY: Input handling', 'CAPABILITY: Result presentation']);
assert.equal(layout.pages[0].domainNodes.length, 0, 'Overview excludes Domain Information');
assert.deepEqual(layout.pages[0].nodes.filter(node => node.kind === 'capability').map(node => node.id), ['input-handling', 'result-presentation']);
assert.equal(layout.pages[0].flows.length, 1, 'Overview collapses to directed cross-Capability dependencies');
assert.equal(layout.pages[0].nodes.filter(node => node.kind === 'trigger').length, 0, 'Overview excludes external triggers');
assert.equal(layout.pages[0].legend.length, 0, 'Overview excludes the Pulse legend');
assert.ok(layout.pages[0].flows.every(flow => !flow.event && !flow.symbol), 'Overview dependency relations carry no Pulse identity');
assert.equal(layout.pages[1].flows.length, 2, 'Source detail covers trigger and outgoing cross-Capability flow');
assert.equal(layout.pages[2].flows.length, 1, 'Destination detail covers incoming cross-Capability flow');
assert.match(layout.pages[1].nodes.find(node => node.kind === 'boundary').name, /^TO /);
assert.match(layout.pages[2].nodes.find(node => node.kind === 'boundary').name, /^FROM /);
assert.deepEqual(layout.pages.map(page => page.legend.map(item => item.display)), [[], ['01', '02'], ['02']], 'Detail legends preserve global display identities while overview has no Pulse legend');

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
const coverageOverview = layoutPulse(coveragePulse).pages[0];
assert.equal(coverageOverview.flows.length, 1, 'Capability overview keeps only the cross-capability dependency');
assert.equal(coverageOverview.nodes.filter(node => node.kind === 'trigger').length, 0,
  'Capability overview excludes external trigger occurrences');
const coverageDetail = layoutPulse(coveragePulse).pages.find(page =>
  page.nodes.some(node => node.kind === 'behavior' && node.id === 'a1'));
assert.ok(coverageDetail.nodes.some(node => node.kind === 'trigger' && node.name === 'Start'),
  'Capability detail preserves the concrete external trigger');


// Capability overview collapses Behavior-level multiplicity and Pulse identity into one directed Capability dependency.
const projectionDedupPulse = {
  capabilities: [{id: 'source-cap', name: 'Source'}, {id: 'target-cap', name: 'Target'}],
  'domain-information': [],
  behaviors: [
    {id: 's1', name: 'S1', capability: 'source-cap'},
    {id: 's2', name: 'S2', capability: 'source-cap'},
    {id: 't1', name: 'T1', capability: 'target-cap'},
    {id: 't2', name: 'T2', capability: 'target-cap'},
  ],
  pulses: [{id: 'shared', display: '1', name: 'Shared'}],
  flows: [
    {from: 's1', pulse: 'shared', to: 't1'},
    {from: 's1', pulse: 'shared', to: 't2'},
    {from: 's2', pulse: 'shared', to: 't1'},
    {from: 's2', pulse: 'shared', to: 't2'},
  ],
};
const projectionDedupOverview = layoutPulse(projectionDedupPulse).pages[0];
assert.equal(projectionDedupOverview.flows.length, 1,
  'Capability overview renders one line per directed source/target Capability pair');
assert.equal(projectionDedupOverview.flows[0].from, 'source-cap');
assert.equal(projectionDedupOverview.flows[0].to, 'target-cap');
assert.equal(projectionDedupOverview.flows[0].pulse, undefined);

const largePulse = {
  capabilities: [{id: 'large', name: 'Large'}], 'domain-information': [],
  behaviors: Array.from({length: 16}, (_, index) => ({id: `b${index}`, name: `B${index}`, capability: 'large'})),
  pulses: Array.from({length: 16}, (_, index) => ({id: `p${index}`, display: String(index + 1), name: `P${index}`})),
  flows: Array.from({length: 16}, (_, index) => ({trigger: `T${index}`, pulse: `p${index}`, to: `b${index}`})),
};
const largeStart = performance.now();
const largeLayout = layoutPulse(largePulse);
assert.ok(performance.now() - largeStart < 2000, 'Large Pulse projection avoids combinatorial order search');
assert.equal(largeLayout.pages[0].flows.length, 0, 'Single-Capability model has no overview dependencies');

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
assert.equal(fanoutLayout.pages[1].flows.length, 9);

const coverage = layoutPulse(coveragePulse).pages;
assert.equal(coverage[0].flows.length, 1, 'Overview excludes same-Capability and external-trigger flows');
assert.equal(coverage[1].flows.length, 3, 'Source detail covers trigger, internal, and outgoing cross-Capability flows');
assert.equal(coverage[2].flows.length, 1, 'Destination detail covers only incoming cross-Capability flow');

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


const repeatedCapabilityFlowPulse = {
  capabilities: [
    {id: 'source', name: 'Source'},
    {id: 'branch', name: 'Branch'},
    {id: 'relay', name: 'Relay'},
    {id: 'sink', name: 'Sink'},
    {id: 'auxiliary', name: 'Auxiliary'},
    {id: 'archive', name: 'Archive'},
  ],
  'domain-information': [],
  behaviors: [
    {id: 'source-a', name: 'Source A', capability: 'source'},
    {id: 'source-b', name: 'Source B', capability: 'source'},
    {id: 'branch-a', name: 'Branch A', capability: 'branch'},
    {id: 'branch-b', name: 'Branch B', capability: 'branch'},
    {id: 'relay-a', name: 'Relay A', capability: 'relay'},
    {id: 'relay-b', name: 'Relay B', capability: 'relay'},
    {id: 'sink-a', name: 'Sink A', capability: 'sink'},
    {id: 'auxiliary-a', name: 'Auxiliary A', capability: 'auxiliary'},
    {id: 'archive-a', name: 'Archive A', capability: 'archive'},
  ],
  pulses: [
    {id: 'branch-a-ready', display: 'A', name: 'Branch A ready'},
    {id: 'relay-ready', display: 'B', name: 'Relay ready'},
    {id: 'branch-b-ready', display: 'C', name: 'Branch B ready'},
    {id: 'shared-update', display: 'D', name: 'Shared update'},
    {id: 'alternate-branch-update', display: 'E', name: 'Alternate branch update'},
    {id: 'direct-update', display: 'F', name: 'Direct update'},
    {id: 'source-triggered', display: 'G', name: 'Source triggered'},
    {id: 'branch-triggered', display: 'H', name: 'Branch triggered'},
    {id: 'relay-triggered', display: 'I', name: 'Relay triggered'},
    {id: 'sink-triggered', display: 'J', name: 'Sink triggered'},
    {id: 'auxiliary-triggered', display: 'K', name: 'Auxiliary triggered'},
    {id: 'archive-triggered', display: 'L', name: 'Archive triggered'},
    {id: 'source-to-auxiliary', display: 'M', name: 'Source to auxiliary'},
    {id: 'branch-to-archive', display: 'N', name: 'Branch to archive'},
  ],
  flows: [
    {from: 'source-a', pulse: 'branch-a-ready', to: 'branch-a'},
    {from: 'source-b', pulse: 'alternate-branch-update', to: 'branch-b'},
    {from: 'source-b', pulse: 'relay-ready', to: 'relay-a'},
    {from: 'source-a', pulse: 'branch-b-ready', to: 'relay-b'},
    {from: 'branch-a', pulse: 'direct-update', to: 'sink-a'},
    {from: 'relay-a', pulse: 'shared-update', to: 'sink-a'},
    {from: 'relay-b', pulse: 'shared-update', to: 'sink-a'},
    {from: 'source-a', pulse: 'source-to-auxiliary', to: 'auxiliary-a'},
    {from: 'branch-b', pulse: 'branch-to-archive', to: 'archive-a'},
    {trigger: 'Source event', pulse: 'source-triggered', to: 'source-a'},
    {trigger: 'Branch event', pulse: 'branch-triggered', to: 'branch-a'},
    {trigger: 'Relay event', pulse: 'relay-triggered', to: 'relay-a'},
    {trigger: 'Sink event', pulse: 'sink-triggered', to: 'sink-a'},
    {trigger: 'Auxiliary event', pulse: 'auxiliary-triggered', to: 'auxiliary-a'},
    {trigger: 'Archive event', pulse: 'archive-triggered', to: 'archive-a'},
  ],
};
const repeatedCapabilityOverview = layoutPulse(repeatedCapabilityFlowPulse).pages[0];
assert.equal(repeatedCapabilityOverview.nodes.filter(node => node.kind === 'trigger').length, 0,
  'Capability overview has no external-trigger nodes');
assert.equal(repeatedCapabilityOverview.legend.length, 0,
  'Capability overview has no Pulse legend');
const dependencyKeys = repeatedCapabilityOverview.flows.map(flow => `${flow.from}->${flow.to}`);
assert.equal(new Set(dependencyKeys).size, dependencyKeys.length,
  'Capability overview contains one connector per directed Capability dependency');
assert.ok(repeatedCapabilityOverview.flows.every(flow => flow.pulse === undefined && flow.event === undefined && flow.symbol === undefined),
  'Capability overview dependency connectors have no Pulse identity');
const positiveSegmentOverlap = (a1, a2, b1, b2) => Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 0.01;
const connectorSegments = flow => flow.points.slice(1).map((end, index) => ({start: flow.points[index], end}));
const collinearSegmentOverlap = (a, b) => {
  const ah = Math.abs(a.start.y - a.end.y) < 0.01;
  const bh = Math.abs(b.start.y - b.end.y) < 0.01;
  const av = Math.abs(a.start.x - a.end.x) < 0.01;
  const bv = Math.abs(b.start.x - b.end.x) < 0.01;
  if (ah && bh && Math.abs(a.start.y - b.start.y) < 0.01)
    return positiveSegmentOverlap(a.start.x, a.end.x, b.start.x, b.end.x);
  if (av && bv && Math.abs(a.start.x - b.start.x) < 0.01)
    return positiveSegmentOverlap(a.start.y, a.end.y, b.start.y, b.end.y);
  return false;
};
const connectorTouchesUnrelatedNode = (flow, node) => {
  if (node.id === flow.from || node.id === flow.to) return false;
  return flow.points.slice(1).some((end, index) => {
    const start = flow.points[index];
    if (start.y === end.y) return start.y >= node.y && start.y <= node.y + node.height
      && Math.max(Math.min(start.x, end.x), node.x) <= Math.min(Math.max(start.x, end.x), node.x + node.width);
    if (start.x === end.x) return start.x >= node.x && start.x <= node.x + node.width
      && Math.max(Math.min(start.y, end.y), node.y) <= Math.min(Math.max(start.y, end.y), node.y + node.height);
    return false;
  });
};
for (const flow of repeatedCapabilityOverview.flows) {
  const sourceNode = repeatedCapabilityOverview.nodes.find(node => node.id === flow.from);
  const targetNode = repeatedCapabilityOverview.nodes.find(node => node.id === flow.to);
  assert.equal(flow.points[0].x, sourceNode.x + sourceNode.width,
    'Overview dependency leaves its source Capability on the right side');
  assert.equal(flow.points.at(-1).x, targetNode.x,
    'Overview dependency enters its target Capability on the left side');
  for (const node of repeatedCapabilityOverview.nodes) assert.ok(!connectorTouchesUnrelatedNode(flow, node),
    `Overview dependency ${flow.from}->${flow.to} stays clear of unrelated node ${node.name}`);
}

for (let left = 0; left < repeatedCapabilityOverview.flows.length; left += 1) {
  for (let right = left + 1; right < repeatedCapabilityOverview.flows.length; right += 1) {
    const first = repeatedCapabilityOverview.flows[left];
    const second = repeatedCapabilityOverview.flows[right];
    for (const a of connectorSegments(first)) for (const b of connectorSegments(second))
      assert.ok(!collinearSegmentOverlap(a, b),
        `Overview connectors ${first.from}->${first.to} and ${second.from}->${second.to} must never share horizontal or vertical line segments`);
  }
}
const cornerClearance = 24;
for (const flow of repeatedCapabilityOverview.flows) {
  const sourceNode = repeatedCapabilityOverview.nodes.find(node => node.id === flow.from);
  const targetNode = repeatedCapabilityOverview.nodes.find(node => node.id === flow.to);
  const sourceY = flow.points[0].y;
  const targetY = flow.points.at(-1).y;
  assert.ok(sourceY >= sourceNode.y + cornerClearance && sourceY <= sourceNode.y + sourceNode.height - cornerClearance,
    `Overview dependency ${flow.from}->${flow.to} keeps source port clear of horizontal box edges`);
  assert.ok(targetY >= targetNode.y + cornerClearance && targetY <= targetNode.y + targetNode.height - cornerClearance,
    `Overview dependency ${flow.from}->${flow.to} keeps target port clear of horizontal box edges`);
}

const output = path.join(directory, 'pulse.pdf');
const result = spawnSync(process.execPath, [path.join(root, 'tools', 'render_pulse_native.mjs'), '--source', directory, '--output', output], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
const source = fs.readFileSync(output, 'latin1');
assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 3);
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 5, 'Every rendered requirement-addressable occurrence is annotated; collapsed overview dependencies add no Pulse annotation');
assert.doesNotMatch(source, /<svg|\/Image\b/);
const pdf = await PDFDocument.load(fs.readFileSync(output));
const pulseContents = pdf.getPages().flatMap(page => page.node.Annots().asArray().map(reference => pdf.context.lookup(reference)))
  .filter(annotation => annotation.get(PDFName.of('Subtype'))?.toString() === '/Text')
  .map(annotation => annotation.get(PDFName.of('Contents')).decodeText());
assert.equal(pulseContents.filter(text => text === 'The result ready event shall retain its identity.\n\nThe result ready event shall follow result establishment.').length, 2, 'Repeated Pulse occurrences in Capability details preserve complete declared requirement order; overview dependency adds no Pulse occurrence');

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
const denseOverviewPulse = {
  capabilities: Array.from({length: 8}, (_, index) => ({id: `cap-${index}`, name: `Capability ${index}`})),
  'domain-information': [],
  behaviors: Array.from({length: 8}, (_, index) => ({id: `dense-${index}`, name: `Dense ${index}`, capability: `cap-${index}`})),
  pulses: Array.from({length: 36}, (_, index) => ({id: `dense-pulse-${index}`, display: String(index + 1), name: `Dense Pulse ${index + 1}`})),
  flows: [],
};
let densePulseIndex = 0;
for (let source = 0; source < 8 && densePulseIndex < 36; source += 1) {
  for (let target = source + 1; target < 8 && densePulseIndex < 36; target += 1) {
    denseOverviewPulse.flows.push({from: `dense-${source}`, pulse: `dense-pulse-${densePulseIndex}`, to: `dense-${target}`});
    densePulseIndex += 1;
  }
}
while (densePulseIndex < 36) {
  denseOverviewPulse.flows.push({trigger: `Dense trigger ${densePulseIndex}`, pulse: `dense-pulse-${densePulseIndex}`, to: `dense-${densePulseIndex % 8}`});
  densePulseIndex += 1;
}
const denseLayout = layoutPulse(denseOverviewPulse, {tracePhases: true});
const denseOverview = denseLayout.pages[0];
const densePairs = new Set(denseOverviewPulse.flows.filter(flow => 'from' in flow).map(flow => { const from = denseOverviewPulse.behaviors.find(b => b.id === flow.from).capability; const to = denseOverviewPulse.behaviors.find(b => b.id === flow.to).capability; return from === to ? null : `${from}->${to}`; }).filter(Boolean));
assert.equal(denseOverview.flows.length, densePairs.size, 'Dense overview collapses flows to unique directed Capability dependencies');
assert.equal(denseLayout.pages.length, 9, 'Dense projection includes overview and capability detail pages');

console.log('CPU v2 Pulse projection, layout, PDF, annotation, and stress checks passed');
