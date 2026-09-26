import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {
  PDFBool,
  PDFDocument,
  PDFHexString,
  PDFName,
  StandardFonts,
  rgb,
} = createRequire(import.meta.url)('pdf-lib');

const palette = {
  ink: rgb(0.06, 0.10, 0.20),
  line: rgb(0.16, 0.24, 0.40),
  system: rgb(0.91, 0.94, 1),
  party: rgb(0.98, 0.99, 1),
  accent: rgb(0.10, 0.28, 0.70),
  white: rgb(1, 1, 1),
};

function centeredText(page, font, text, box, size, color = palette.ink) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - size) / 2 + 2,
    size,
    font,
    color,
  });
}

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

function pointAlong(points, distanceFromStart) {
  let remaining = distanceFromStart;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (remaining <= length) {
      const ratio = length ? remaining / length : 0;
      return {x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio};
    }
    remaining -= length;
  }
  return points.at(-1);
}

function totalLength(points) {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(
    point.x - points[index].x,
    point.y - points[index].y,
  ), 0);
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
`, {
    Type: PDFName.of('XObject'),
    Subtype: PDFName.of('Form'),
    BBox: [0, 0, 14, 14],
    Matrix: [1, 0, 0, 1, 0, 0],
    Resources: {},
  });
  const appearanceRef = document.context.register(appearance);
  const annotation = document.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Text'),
    Rect: rect,
    Contents: PDFHexString.fromText(contents.join('\n\n')),
    T: PDFHexString.fromText(title),
    Subj: PDFHexString.fromText('CPU directly attached requirements'),
    Name: PDFName.of('Comment'),
    AP: {N: appearanceRef},
    Open: PDFBool.False,
    F: 4,
    C: [0.90, 0.95, 1.00],
  });
  const annotationRef = document.context.register(annotation);
  const popup = document.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Popup'),
    Rect: [rect[2] + 12, rect[3] + 12, rect[2] + 252, rect[3] + 132],
    Parent: annotationRef,
    Open: PDFBool.False,
    F: 4,
  });
  const popupRef = document.context.register(popup);
  annotation.set(PDFName.of('Popup'), popupRef);
  annots.push(annotationRef);
  annots.push(popupRef);
}

export async function renderContextPdf({layout, requirements, output}) {
  const document = await PDFDocument.create();
  document.setTitle('CPU Context');
  document.setCreator('@cpu-model/devmodel native PDF renderer');
  const page = document.addPage([layout.page.width, layout.page.height]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const annots = document.context.obj([]);
  page.node.set(PDFName.of('Annots'), annots);

  page.drawText('CONTEXT', {x: layout.page.margin, y: layout.page.height - 38, size: 10, font: bold, color: palette.accent});

  for (const flow of layout.flows) {
    for (let index = 1; index < flow.points.length; index += 1) line(page, flow.points[index - 1], flow.points[index]);
    arrow(page, flow.points.at(-2), flow.points.at(-1));
    if (flow.initiative) {
      const atStart = flow.initiative === flow.from;
      const distance = atStart ? 16 : totalLength(flow.points) - 20;
      const point = pointAlong(flow.points, distance);
      page.drawCircle({x: point.x, y: point.y, size: 4, color: palette.white, borderColor: palette.line, borderWidth: 1.2});
    }
    const labelWidth = font.widthOfTextAtSize(flow.name, 10) + 14;
    const labelBox = {x: flow.label.x - labelWidth / 2, y: flow.label.y - 8, width: labelWidth, height: 17};
    centeredText(page, font, flow.name, labelBox, 10);
    const target = `context.flow.${flow.id}`;
    if (requirements[target]) {
      addTextAnnotation(document, annots, {
        rect: [labelBox.x - 18, labelBox.y + 1, labelBox.x - 4, labelBox.y + 15],
        title: flow.name,
        contents: requirements[target],
      });
    }
  }

  for (const node of layout.nodes) {
    const strong = node.kind === 'system';
    page.drawRectangle({
      x: node.x, y: node.y, width: node.width, height: node.height,
      color: strong ? palette.system : palette.party,
      borderColor: strong ? palette.accent : palette.line,
      borderWidth: strong ? 2.5 : 1.4,
    });
    if (node.kind === 'person') {
      page.drawCircle({x: node.x + 25, y: node.y + 46, size: 7, borderColor: palette.line, borderWidth: 1.4});
      line(page, {x: node.x + 25, y: node.y + 39}, {x: node.x + 25, y: node.y + 20});
      line(page, {x: node.x + 14, y: node.y + 32}, {x: node.x + 36, y: node.y + 32});
      line(page, {x: node.x + 25, y: node.y + 20}, {x: node.x + 16, y: node.y + 10});
      line(page, {x: node.x + 25, y: node.y + 20}, {x: node.x + 34, y: node.y + 10});
    }
    const textBox = node.kind === 'person'
      ? {x: node.x + 43, y: node.y, width: node.width - 49, height: node.height}
      : node;
    centeredText(page, strong ? bold : font, node.name, textBox, strong ? 13 : 11);
    const targetKind = strong ? 'system' : 'party';
    const target = `context.${targetKind}.${node.id}`;
    if (requirements[target]) addTextAnnotation(document, annots, {
      rect: [node.x + node.width - 14, node.y + node.height - 14, node.x + node.width, node.y + node.height],
      title: node.name,
      contents: requirements[target],
    });
  }

  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, await document.save({useObjectStreams: false}));
}
