import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  layoutPulse, MIN_CHANNEL_SPACING, MIN_PORT_SPACING, MIN_SIDE_CLEARANCE, PULSE_LINE_CLEARANCE, PULSE_RADIUS,
} from '../tools/native/pulse_layout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionToolFiles = [
  ...fs.readdirSync(path.join(root, 'tools', 'native')).filter(name => name.endsWith('.mjs'))
    .map(name => path.join(root, 'tools', 'native', name)),
  ...fs.readdirSync(path.join(root, 'tools')).filter(name => name.endsWith('.mjs'))
    .map(name => path.join(root, 'tools', name)),
];
const productionToolSource = productionToolFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
for (const forbidden of [
  'isEvcReviewProfile', 'evc', 'mercedes', 'garo', 'observe-vehicle',
  'handle-manual-planning-choice', 'restore-system-state', 'choose-morning-target',
  'choose-afternoon-target', 'secure-baseline-target', 'end-target',
  'plan-charging', 'activate-plan', 'control-charger',
]) {
  assert.doesNotMatch(productionToolSource, new RegExp(forbidden, 'i'),
    `Production tools must not contain project-specific rule: ${forbidden}`);
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-native-pulse-'));
fs.copyFileSync(path.join(root, 'examples', 'model', 'pulse.yaml'), path.join(directory, 'pulse.yaml'));
const requirements = fs.readFileSync(path.join(root, 'examples', 'model', 'requirements.yaml'), 'utf8');
fs.writeFileSync(path.join(directory, 'requirements.yaml'), `${requirements}  pulse.pulse.input-submitted:\n    - The input submitted event shall retain its identity.\n`);
const output = path.join(directory, 'pulse.pdf');
const result = spawnSync(process.execPath, [
  path.join(root, 'tools', 'render_pulse_native.mjs'),
  '--source', directory, '--output', output,
], {encoding: 'utf8'});
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(output), true);
const source = fs.readFileSync(output, 'latin1');
assert.match(source, /\/Title <FEFF004300500055002000500075006C00730065>/);
assert.match(source, /\/Subtype \/Text/);
assert.match(source, /\/Name \/Comment/);
assert.match(source, /\/AP <<\n\/N /);
assert.match(source, /\/BBox \[ 0 0 14 14 \]/);
assert.match(source, /\/Subtype \/Popup/);
assert.equal((source.match(/\/Subtype \/Text/g) || []).length, 2);
assert.doesNotMatch(source, /\/Open true/);
assert.doesNotMatch(source, /<svg|\/Image\b/);
assert.match(source, /FEFF005400680065002000730079007300740065006D/);

const stressLayout = layoutPulse({
  behaviors: [
    {id: 'source', name: 'Source'},
    ...Array.from({length: 4}, (_, index) => ({id: `target-${index}`, name: `Target ${index}`})),
  ],
  pulses: Array.from({length: 5}, (_, index) => ({id: `pulse-${index}`, display: `${index}`, name: `Pulse ${index}`})),
  flows: [
    {trigger: 'Start', pulse: 'pulse-0', to: 'source'},
    ...Array.from({length: 4}, (_, index) => ({from: 'source', pulse: `pulse-${index + 1}`, to: `target-${index}`})),
  ],
});
const sourceNode = stressLayout.nodes.find(node => node.id === 'source');
const sourceConnections = stressLayout.flows.filter(flow => flow.from === 'source');
assert.ok(MIN_PORT_SPACING >= PULSE_RADIUS * 2 + PULSE_LINE_CLEARANCE * 2,
  'Port spacing includes the pulse circle diameter and line clearance on both sides');
const ys = sourceConnections.map(flow => flow.points[0].y).sort((a, b) => a - b);
for (let index = 1; index < ys.length; index += 1) assert.ok(ys[index] - ys[index - 1] >= MIN_PORT_SPACING);
assert.ok(sourceNode.height >= 48 + (sourceConnections.length - 1) * MIN_PORT_SPACING);
const targetCenters = new Map(stressLayout.nodes.map(node => [node.id, node.y + node.height / 2]));
const spatialOrder = [...sourceConnections].sort((a, b) => targetCenters.get(a.to) - targetCenters.get(b.to));
for (let index = 1; index < spatialOrder.length; index += 1) {
  assert.ok(spatialOrder[index].points[0].y > spatialOrder[index - 1].points[0].y);
}
const horizontalSegments = stressLayout.flows.flatMap(flow => flow.points.slice(1).map((point, index) => ({
  start: flow.points[index], end: point,
}))).filter(segment => segment.start.y === segment.end.y);
for (let left = 0; left < horizontalSegments.length; left += 1) {
  for (let right = left + 1; right < horizontalSegments.length; right += 1) {
    const a = horizontalSegments[left];
    const b = horizontalSegments[right];
    const overlap = Math.min(Math.max(a.start.x, a.end.x), Math.max(b.start.x, b.end.x))
      - Math.max(Math.min(a.start.x, a.end.x), Math.min(b.start.x, b.end.x));
    if (overlap > 0.01) assert.ok(Math.abs(a.start.y - b.start.y) >= 18);
  }
}
for (const flow of stressLayout.flows) {
  assert.ok(flow.points.length - 2 <= 4, 'A connection uses no more than four knees');
  for (let index = 1; index < flow.points.length; index += 1) {
    const previous = flow.points[index - 1];
    const current = flow.points[index];
    assert.ok(previous.x === current.x || previous.y === current.y, 'Connections contain no diagonal segments');
  }
  if (flow.points.length > 2) {
    assert.ok(flow.points[1].x - flow.points[0].x >= MIN_SIDE_CLEARANCE,
      'A routed connection clears the source element side');
    const last = flow.points.length - 1;
    assert.ok(flow.points[last].x - flow.points[last - 1].x >= MIN_SIDE_CLEARANCE,
      'A routed connection clears the target element side');
  }
}

const horizontalLayout = layoutPulse({
  behaviors: [{id: 'target', name: 'Target'}],
  pulses: [{id: 'pulse', display: '01', name: 'Pulse'}],
  flows: [{trigger: 'Start', pulse: 'pulse', to: 'target'}],
});
assert.equal(horizontalLayout.flows[0].points.length, 2, 'Nearby elements use a straight connection first');
assert.equal(horizontalLayout.flows[0].points[0].y, horizontalLayout.flows[0].points[1].y,
  'A straight connection is horizontal');

const relayLayout = layoutPulse({
  behaviors: [{id: 'relay', name: 'Relay'}, {id: 'target', name: 'Target'}],
  pulses: [
    {id: 'into-relay', display: '01', name: 'Into relay'},
    {id: 'out-of-relay', display: '02', name: 'Out of relay'},
  ],
  flows: [
    {trigger: 'Start', pulse: 'into-relay', to: 'relay'},
    {from: 'relay', pulse: 'out-of-relay', to: 'target'},
  ],
});
assert.ok(relayLayout.flows.every(flow => flow.points.length === 2),
  'Ports on opposite sides of a relay may share one horizontal axis');

const fanInLayout = layoutPulse({
  behaviors: [
    ...Array.from({length: 5}, (_, index) => ({id: `source-${index}`, name: `Source ${index}`})),
    {id: 'target', name: 'Target'},
  ],
  pulses: Array.from({length: 10}, (_, index) => ({id: `fan-${index}`, display: `${index}`, name: `Fan ${index}`})),
  flows: [
    ...Array.from({length: 5}, (_, index) => ({trigger: `Start ${index}`, pulse: `fan-${index}`, to: `source-${index}`})),
    ...Array.from({length: 5}, (_, index) => ({from: `source-${index}`, pulse: `fan-${index + 5}`, to: 'target'})),
  ],
});
const fanSources = fanInLayout.nodes.filter(node => node.id.startsWith('source-'));
const fanTarget = fanInLayout.nodes.find(node => node.id === 'target');
const approachGap = fanTarget.x - Math.max(...fanSources.map(node => node.x + node.width));
assert.ok(approachGap >= MIN_SIDE_CLEARANCE * 2 + 4 * MIN_CHANNEL_SPACING,
  'A target column gap reserves safe approach channels for every incoming connection');
const properCrossing = (a, b, c, d) => {
  const firstHorizontal = a.y === b.y;
  const secondHorizontal = c.y === d.y;
  if (firstHorizontal === secondHorizontal) return false;
  const horizontal = firstHorizontal ? {a, b} : {a: c, b: d};
  const vertical = firstHorizontal ? {a: c, b: d} : {a, b};
  return vertical.a.x > Math.min(horizontal.a.x, horizontal.b.x)
    && vertical.a.x < Math.max(horizontal.a.x, horizontal.b.x)
    && horizontal.a.y > Math.min(vertical.a.y, vertical.b.y)
    && horizontal.a.y < Math.max(vertical.a.y, vertical.b.y);
};
const collinearOverlap = (a, b, c, d) => {
  if (a.y === b.y && c.y === d.y && a.y === c.y) {
    return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
      - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) > 0.01;
  }
  if (a.x === b.x && c.x === d.x && a.x === c.x) {
    return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
      - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) > 0.01;
  }
  return false;
};
const fanInConnections = fanInLayout.flows.filter(flow => flow.to === 'target');
for (let left = 0; left < fanInConnections.length; left += 1) {
  for (let right = left + 1; right < fanInConnections.length; right += 1) {
    const a = fanInConnections[left];
    const b = fanInConnections[right];
    const crosses = a.points.slice(1).some((point, index) => b.points.slice(1)
      .some((other, otherIndex) => properCrossing(a.points[index], point, b.points[otherIndex], other)));
    assert.equal(crosses, false, 'Connections sharing a target side preserve their order without crossings');
  }
}
for (const layout of [stressLayout, fanInLayout, relayLayout]) {
  const segments = layout.flows.flatMap(flow => flow.points.slice(1)
    .map((point, index) => ({flow, start: flow.points[index], end: point})));
  for (let left = 0; left < segments.length; left += 1) {
    for (let right = left + 1; right < segments.length; right += 1) {
      if (segments[left].flow === segments[right].flow) continue;
      assert.equal(collinearOverlap(segments[left].start, segments[left].end,
        segments[right].start, segments[right].end), false,
      'Different connections never share a collinear segment');
    }
  }
}
assert.ok(stressLayout.page.height > 595);
console.log('Native Pulse PDF checks passed');
