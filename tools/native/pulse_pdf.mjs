import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {PDFBool, PDFDocument, PDFHexString, PDFName, StandardFonts, rgb} = createRequire(import.meta.url)('pdf-lib');

const palette = {
  ink: rgb(0.06, 0.10, 0.20), line: rgb(0.16, 0.24, 0.40),
  fill: rgb(0.95, 0.97, 1), accent: rgb(0.10, 0.28, 0.70), white: rgb(1, 1, 1),
};

function line(page, from, to, thickness = 1.4) {
  page.drawLine({start: from, end: to, thickness, color: palette.line});
}

function arrow(page, from, to) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = 9;
  const spread = Math.PI / 7;
  line(page, to, {x: to.x - length * Math.cos(angle - spread), y: to.y - length * Math.sin(angle - spread)});
  line(page, to, {x: to.x - length * Math.cos(angle + spread), y: to.y - length * Math.sin(angle + spread)});
}

function centered(page, font, text, box, size) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {x: box.x + (box.width - width) / 2, y: box.y + (box.height - size) / 2 + 2, size, font, color: palette.ink});
}

function wrappedLines(font, text, size, maxWidth) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
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

export async function renderPulsePdf({layout, requirements, output}) {
  const document = await PDFDocument.create();
  document.setTitle('CPU Pulse');
  document.setCreator('@cpu-model/devmodel native PDF renderer');
  const page = document.addPage([layout.page.width, layout.page.height]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const annots = document.context.obj([]);
  page.node.set(PDFName.of('Annots'), annots);
  page.drawText('PULSE', {x: layout.page.margin, y: layout.page.height - 38, size: 10, font: bold, color: palette.accent});

  for (const flow of layout.flows) {
    for (let index = 1; index < flow.points.length; index += 1) line(page, flow.points[index - 1], flow.points[index]);
  }

  for (const node of layout.nodes) {
    if (node.kind === 'behavior') {
      page.drawSvgPath(`M 10 0 H ${node.width - 10} Q ${node.width} 0 ${node.width} 10 V ${node.height - 10} Q ${node.width} ${node.height} ${node.width - 10} ${node.height} H 10 Q 0 ${node.height} 0 ${node.height - 10} V 10 Q 0 0 10 0 Z`, {
        x: node.x, y: node.y + node.height, color: palette.fill, borderColor: palette.accent, borderWidth: 2,
      });
      centered(page, bold, node.name, node, 11);
      const target = `pulse.behavior.${node.id}`;
      if (requirements[target]) addTextAnnotation(document, annots, {
        rect: [node.x + node.width - 18, node.y + node.height - 18, node.x + node.width - 4, node.y + node.height - 4],
        title: node.name, contents: requirements[target],
      });
      continue;
    }
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    page.drawSvgPath(`M ${node.width / 2} 0 L ${node.width} ${node.height / 2} L ${node.width / 2} ${node.height} L 0 ${node.height / 2} Z`, {
      x: node.x, y: node.y + node.height, color: palette.fill, borderColor: palette.line, borderWidth: 1.6,
    });
    const lines = wrappedLines(font, node.name, 9, node.width * 0.58);
    const lineHeight = 11;
    const startY = cy + ((lines.length - 1) * lineHeight) / 2 - 3;
    lines.forEach((text, index) => {
      const width = font.widthOfTextAtSize(text, 9);
      page.drawText(text, {x: cx - width / 2, y: startY - index * lineHeight, size: 9, font, color: palette.ink});
    });
  }

  // Arrowheads are a foreground layer so a target box cannot cover them.
  for (const flow of layout.flows) arrow(page, flow.points.at(-2), flow.points.at(-1));

  // Pulse symbols are a foreground layer. No connection may visually pass
  // through a previously drawn pulse ring.
  for (const flow of layout.flows) {
    page.drawCircle({x: flow.symbol.x, y: flow.symbol.y, size: 14, color: palette.white, borderColor: palette.accent, borderWidth: 2});
    const displayWidth = bold.widthOfTextAtSize(flow.event.display, 9);
    page.drawText(flow.event.display, {x: flow.symbol.x - displayWidth / 2, y: flow.symbol.y - 3.2, size: 9, font: bold, color: palette.accent});
    const target = `pulse.pulse.${flow.event.id}`;
    if (requirements[target]) addTextAnnotation(document, annots, {
      rect: [flow.annotation.x, flow.annotation.y, flow.annotation.x + 14, flow.annotation.y + 14],
      title: flow.event.name, contents: requirements[target],
    });
  }

  const legendX = layout.legendArea.x;
  const legendY = layout.legendArea.y;
  const rows = Math.ceil(layout.legend.length / layout.legendArea.columns);
  const columnWidth = layout.legendArea.width / layout.legendArea.columns;
  page.drawText('PULSES', {x: legendX, y: legendY + layout.legendArea.height - 18, size: 10, font: bold, color: palette.accent});
  layout.legend.forEach((event, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    const x = legendX + column * columnWidth;
    const y = legendY + layout.legendArea.height - 40 - row * 18;
    page.drawText(event.display, {x, y, size: 9, font: bold, color: palette.accent});
    page.drawText(event.name, {x: x + 28, y, size: 8.3, font, color: palette.ink});
  });

  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, await document.save({useObjectStreams: false}));
}
