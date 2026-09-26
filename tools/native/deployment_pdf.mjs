import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {PDFBool, PDFDocument, PDFHexString, PDFName, StandardFonts, rgb} = createRequire(import.meta.url)('pdf-lib');
const palette = {
  ink: rgb(0.06, 0.10, 0.20), line: rgb(0.16, 0.24, 0.40),
  host: rgb(0.97, 0.98, 1), program: rgb(0.93, 0.96, 1), service: rgb(0.97, 0.98, 1),
  port: rgb(1, 1, 1), accent: rgb(0.10, 0.28, 0.70), white: rgb(1, 1, 1),
};

function drawLine(page, start, end, thickness = 1.4) {
  page.drawLine({start, end, thickness, color: palette.line});
}
function arrow(page, from, to) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = 8;
  const spread = Math.PI / 7;
  drawLine(page, to, {x: to.x - length * Math.cos(angle - spread), y: to.y - length * Math.sin(angle - spread)});
  drawLine(page, to, {x: to.x - length * Math.cos(angle + spread), y: to.y - length * Math.sin(angle + spread)});
}
function rounded(page, box, radius, color, borderColor = palette.line, borderWidth = 1.4) {
  page.drawSvgPath(`M ${radius} 0 H ${box.width - radius} Q ${box.width} 0 ${box.width} ${radius} V ${box.height - radius} Q ${box.width} ${box.height} ${box.width - radius} ${box.height} H ${radius} Q 0 ${box.height} 0 ${box.height - radius} V ${radius} Q 0 0 ${radius} 0 Z`, {
    x: box.x, y: box.y + box.height, color, borderColor, borderWidth,
  });
}
function addTextAnnotation(document, annots, {rect, title, contents}) {
  const appearance = document.context.flateStream(`
q
0.10 0.28 0.70 rg
0 0 14 14 re f
1 1 1 RG
1.1 w
3 4 m
3 11 l
11 11 l
11 6 l
7 6 l
4 3 l
5 6 l
3 6 l
h
S
Q
`, {Type: PDFName.of('XObject'), Subtype: PDFName.of('Form'), BBox: [0, 0, 14, 14], Matrix: [1, 0, 0, 1, 0, 0], Resources: {}});
  const appearanceRef = document.context.register(appearance);
  const annotation = document.context.obj({
    Type: PDFName.of('Annot'), Subtype: PDFName.of('Text'), Rect: rect,
    Contents: PDFHexString.fromText(contents.join('\n\n')), T: PDFHexString.fromText(title),
    Subj: PDFHexString.fromText('CPU directly attached requirements'), Name: PDFName.of('Comment'),
    AP: {N: appearanceRef}, Open: PDFBool.False, F: 4, C: [0.90, 0.95, 1.00],
  });
  const annotationRef = document.context.register(annotation);
  const popup = document.context.obj({
    Type: PDFName.of('Annot'), Subtype: PDFName.of('Popup'),
    Rect: [rect[2] + 12, rect[3] + 12, rect[2] + 252, rect[3] + 132],
    Parent: annotationRef, Open: PDFBool.False, F: 4,
  });
  const popupRef = document.context.register(popup);
  annotation.set(PDFName.of('Popup'), popupRef);
  annots.push(annotationRef);
  annots.push(popupRef);
}
function markerForBox(document, annots, box, title, contents) {
  if (!contents) return;
  addTextAnnotation(document, annots, {
    rect: [box.x + box.width - 22, box.y + box.height - 22, box.x + box.width - 8, box.y + box.height - 8],
    title, contents,
  });
}
function implementationDetail(unit) {
  return [unit.type, unit.role, unit.implementation?.language, unit.implementation?.platform].filter(Boolean).join(' · ');
}

export async function renderDeploymentPdf({layout, requirements, output}) {
  const document = await PDFDocument.create();
  document.setTitle('CPU Deployment');
  document.setCreator('@cpu-model/devmodel native PDF renderer');
  const page = document.addPage([layout.page.width, layout.page.height]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const annots = document.context.obj([]);
  page.node.set(PDFName.of('Annots'), annots);
  page.drawText('DEPLOYMENT', {x: layout.page.margin, y: layout.page.height - 38, size: 10, font: bold, color: palette.accent});

  for (const host of layout.hosts) {
    page.drawRectangle({x: host.x, y: host.y, width: host.width, height: host.height, color: palette.host, borderColor: palette.accent, borderWidth: 2.5});
    page.drawText(host.name, {x: host.x + 18, y: host.y + host.height - 28, size: 13, font: bold, color: palette.ink});
    page.drawText([host.type, host.os, host.architecture].filter(Boolean).join(' · '), {x: host.x + 18, y: host.y + host.height - 45, size: 8.5, font, color: palette.line});
    markerForBox(document, annots, host, host.name, requirements[`deployment.host.${host.id}`]);

    for (const program of host.programs) {
      rounded(page, program, 10, palette.program, palette.accent, 1.8);
      page.drawText(program.name, {x: program.x + 16, y: program.y + program.height - 26, size: 11, font: bold, color: palette.ink});
      page.drawText(implementationDetail(program), {x: program.x + 16, y: program.y + program.height - 42, size: 7.8, font, color: palette.line});
      markerForBox(document, annots, program, program.name, requirements[`deployment.program.${program.id}`]);

      for (const port of program.ports) {
        rounded(page, port, 6, palette.port, palette.line, 1);
        page.drawText(port.name, {x: port.x + 10, y: port.y + 24, size: 9, font: bold, color: palette.ink});
        page.drawText(port.detail, {x: port.x + 10, y: port.y + 10, size: 7.5, font, color: palette.line});
        markerForBox(document, annots, port, port.name, requirements[`deployment.program.${program.id}.port.${port.id}`]);
      }
      for (const service of program.services) {
        rounded(page, service, 8, palette.service, palette.line, 1.3);
        page.drawText(service.name, {x: service.x + 14, y: service.y + service.height - 24, size: 10, font: bold, color: palette.ink});
        page.drawText(implementationDetail(service), {x: service.x + 14, y: service.y + service.height - 39, size: 7.5, font, color: palette.line});
        markerForBox(document, annots, service, service.name, requirements[`deployment.service.${program.id}.${service.id}`]);
        for (const port of service.ports) {
          rounded(page, port, 5, palette.port, palette.line, 1);
          page.drawText(port.name, {x: port.x + 9, y: port.y + 21, size: 8.5, font: bold, color: palette.ink});
          page.drawText(port.detail, {x: port.x + 9, y: port.y + 8, size: 7.3, font, color: palette.line});
          markerForBox(document, annots, port, port.name, requirements[`deployment.service.${program.id}.${service.id}.port.${port.id}`]);
        }
      }
    }
  }

  for (const connection of layout.connections) {
    for (let index = 1; index < connection.points.length; index += 1) drawLine(page, connection.points[index - 1], connection.points[index]);
    arrow(page, connection.points.at(-2), connection.points.at(-1));
    const width = font.widthOfTextAtSize(connection.detail, 8.5);
    page.drawText(connection.detail, {x: connection.label.x - width / 2, y: connection.label.y, size: 8.5, font, color: palette.ink});
    const target = `deployment.connection.${connection.id}`;
    if (requirements[target]) addTextAnnotation(document, annots, {
      rect: [connection.label.x - width / 2 - 32, connection.label.y - 3, connection.label.x - width / 2 - 18, connection.label.y + 11],
      title: connection.name, contents: requirements[target],
    });
  }

  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, await document.save({useObjectStreams: false}));
}
