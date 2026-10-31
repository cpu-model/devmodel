import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {layoutDeployment} from '../tools/native/deployment_layout.mjs';
import {renderDeploymentPdf} from '../tools/native/deployment_pdf.mjs';

const {PDFDocument, PDFName} = createRequire(import.meta.url)('pdf-lib');

function program(id, host) {
  return {id, name: `Program ${id}`, host, type: 'external-service', ports: [], services: []};
}

function deployment(counts) {
  const hosts = counts.map((_, index) => ({id: `host-${index + 1}`, name: `Host ${index + 1}`, type: 'external'}));
  const programs = hosts.flatMap((host, hostIndex) => Array.from(
    {length: counts[hostIndex]},
    (_, programIndex) => program(`p-${hostIndex + 1}-${programIndex + 1}`, host.id),
  ));
  const connections = programs.map((target, index) => ({
    id: `connection-${index + 1}`, name: `Connection ${index + 1}`,
    from: programs[0].id, to: target.id, application: 'https', transport: 'tcp',
  }));
  return {hosts, programs, connections};
}

function assertDistinctPrograms(counts) {
  const source = deployment(counts);
  const layout = layoutDeployment(source);
  assert.equal(layout.hosts.length, source.hosts.length);
  assert.equal(layout.hosts.flatMap(host => host.programs).length, source.programs.length);
  for (const host of layout.hosts) {
    const expected = source.programs.filter(item => item.host === host.id).map(item => item.id);
    assert.deepEqual(host.programs.map(item => item.id), expected);
    const positions = host.programs.map(item => `${item.x}:${item.y}`);
    assert.equal(new Set(positions).size, positions.length, `${host.id} has overlapping program positions`);
  }
  assert.equal(layout.connections.length, source.connections.length);
  for (const connection of layout.connections) {
    assert.equal(connection.points.length, 4);
    const target = source.programs.find(item => item.id === connection.to);
    const targetBox = layout.hosts.flatMap(host => host.programs).find(item => item.id === target.id);
    assert.equal(connection.points.at(-1).y, targetBox.y + targetBox.height / 2);
  }
  return {source, layout};
}

assertDistinctPrograms([1]);
assertDistinctPrograms([2]);
assertDistinctPrograms([3]);
assertDistinctPrograms([5]);
assertDistinctPrograms([3, 2]);

const {source, layout} = assertDistinctPrograms([5, 1]);
const requirements = {};
for (const item of source.programs) {
  requirements[`deployment.program.${item.id}`] = [{id: `require-${item.id}`, text: `Requirement for ${item.id}`}];
}
for (const item of source.connections) {
  requirements[`deployment.connection.${item.id}`] = [{id: `require-${item.id}`, text: `Requirement for ${item.id}`}];
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cpu-deployment-layout-'));
try {
  const output = path.join(directory, 'deployment.pdf');
  await renderDeploymentPdf({layout, requirements, output});
  const document = await PDFDocument.load(fs.readFileSync(output));
  const annotations = document.getPages()[0].node.Annots().asArray();
  const textAnnotations = annotations
    .map(reference => document.context.lookup(reference))
    .filter(annotation => annotation.get(PDFName.of('Subtype'))?.toString() === '/Text');
  assert.equal(textAnnotations.length, source.programs.length + source.connections.length);
  for (const item of [...source.programs, ...source.connections]) {
    const title = item.name;
    const contents = `Requirement for ${item.id}`;
    assert.equal(textAnnotations.some(annotation => (
      annotation.get(PDFName.of('T'))?.decodeText() === title
        && annotation.get(PDFName.of('Contents'))?.decodeText() === contents
    )), true, `Missing or incorrectly targeted annotation for ${item.id}`);
  }
} finally {
  fs.rmSync(directory, {recursive: true, force: true});
}

console.log('Deployment multi-program layout checks passed.');
