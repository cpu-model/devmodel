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

const model = loadPulseModel(directory);
const layout = layoutPulse(model.pulse);
assert.deepEqual(layoutPulse(model.pulse), layout, 'Pulse projections and geometry are deterministic');
assert.equal(layout.pages.length, 3, 'Overview plus one detail per declared Capability');
assert.equal(layout.pages[0].kind, 'overview');
assert.deepEqual(layout.pages.slice(1).map(page => page.title), ['CAPABILITY: Input handling', 'CAPABILITY: Result presentation']);
assert.equal(layout.pages[0].domainNodes.length, 0, 'Overview excludes Domain Information');
assert.deepEqual(layout.pages[0].nodes.filter(node => node.kind === 'capability').map(node => node.id), ['input-handling', 'result-presentation']);
assert.equal(layout.pages[0].flows.length, 2, 'Overview covers trigger and cross-Capability flows');
assert.equal(layout.pages[1].flows.length, 2, 'Source detail covers trigger and outgoing cross-Capability flow');
assert.equal(layout.pages[2].flows.length, 1, 'Destination detail covers incoming cross-Capability flow');
assert.match(layout.pages[1].nodes.find(node => node.kind === 'boundary').name, /^TO /);
assert.match(layout.pages[2].nodes.find(node => node.kind === 'boundary').name, /^FROM /);
assert.deepEqual(layout.pages.map(page => page.legend.map(item => item.display)), [['01', '02'], ['01', '02'], ['02']], 'Local legends preserve global display identities and declaration order');

const behaviorOccurrences = layout.pages.slice(1).flatMap(page => page.nodes.filter(node => node.kind === 'behavior'));
for (const behavior of behaviorOccurrences) {
  const incoming = layout.pages.flatMap(page => page.flows).filter(flow => flow.to === behavior.id);
  const outgoing = layout.pages.flatMap(page => page.flows).filter(flow => flow.from === behavior.id);
  assert.ok(incoming.every(flow => flow.points.at(-1).x === behavior.x), 'Incoming Pulse terminates on left side');
  assert.ok(incoming.every(flow => flow.points.at(-1).y >= behavior.y && flow.points.at(-1).y <= behavior.y + behavior.height), 'Incoming Pulse endpoint lies on the Behavior side');
  assert.ok(outgoing.every(flow => flow.points[0].x === behavior.x + behavior.width), 'Outgoing Pulse starts on right side');
}
for (const page of layout.pages.slice(1)) for (const flow of page.informationFlows) {
  const behavior = page.nodes.find(node => node.id === flow.behavior);
  if (flow.direction === 'in') assert.equal(flow.points.at(-1).y, behavior.y + behavior.height, 'information-in terminates on top');
  else assert.equal(flow.points[0].y, behavior.y, 'information-out starts on bottom');
}
assert.equal(layout.pages.slice(1).flatMap(page => page.domainNodes).filter(node => node.id === 'processed-result').length, 2, 'Domain Information repeats deterministically per participation');
for (const page of layout.pages.slice(1)) {
  for (const information of page.domainNodes) {
    for (const behavior of page.nodes.filter(node => node.kind === 'behavior')) {
      const overlapX = information.x < behavior.x + behavior.width && information.x + information.width > behavior.x;
      const overlapY = information.y < behavior.y + behavior.height && information.y + information.height > behavior.y;
      assert.ok(!(overlapX && overlapY), `Domain Information ${information.id} must not overlap Behavior ${behavior.id}`);
    }
  }
}

const coveragePulse = {
  capabilities: [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}], 'domain-information': [],
  behaviors: [{id: 'a1', name: 'A1', capability: 'a'}, {id: 'a2', name: 'A2', capability: 'a'}, {id: 'b1', name: 'B1', capability: 'b'}],
  pulses: [{id: 'p1', display: '1', name: 'P1'}, {id: 'p2', display: '2', name: 'P2'}, {id: 'p3', display: '3', name: 'P3'}],
  flows: [{trigger: 'Start', pulse: 'p1', to: 'a1'}, {from: 'a1', pulse: 'p2', to: 'a2'}, {from: 'a2', pulse: 'p3', to: 'b1'}],
};
const coverage = layoutPulse(coveragePulse).pages;
assert.equal(coverage[0].flows.length, 2, 'Overview excludes same-Capability flow');
assert.equal(coverage[1].flows.length, 3, 'Source detail covers trigger, internal, and outgoing cross-Capability flows');
assert.equal(coverage[2].flows.length, 1, 'Destination detail covers only incoming cross-Capability flow');

const output = path.join(directory, 'pulse.pdf');
const result = spawnSync(process.execPath, [path.join(root, 'tools', 'render_pulse_native.mjs'), '--source', directory, '--output', output], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
const source = fs.readFileSync(output, 'latin1');
assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 3);
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 6, 'Every requirement-addressable occurrence is annotated');
assert.doesNotMatch(source, /<svg|\/Image\b/);
const pdf = await PDFDocument.load(fs.readFileSync(output));
const pulseContents = pdf.getPages().flatMap(page => page.node.Annots().asArray().map(reference => pdf.context.lookup(reference)))
  .filter(annotation => annotation.get(PDFName.of('Subtype'))?.toString() === '/Text')
  .map(annotation => annotation.get(PDFName.of('Contents')).decodeText());
assert.equal(pulseContents.filter(text => text === 'The result ready event shall retain its identity.\n\nThe result ready event shall follow result establishment.').length, 3, 'Repeated Pulse occurrences preserve complete declared requirement order');

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
assert.equal(stress.domainNodes.length, 12);
assert.ok(stress.flows.every(flow => flow.points.slice(1).every((point, index) => point.x === flow.points[index].x || point.y === flow.points[index].y)), 'Stress routes remain orthogonal');
console.log('CPU v2 Pulse projection, layout, PDF, annotation, and stress checks passed');
