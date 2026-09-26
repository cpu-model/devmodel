import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {PDFBool, PDFDocument, PDFHexString, PDFName, StandardFonts, rgb} = createRequire(import.meta.url)('pdf-lib');

const palette = {
  ink: rgb(0.06, 0.10, 0.20), line: rgb(0.16, 0.24, 0.40),
  fill: rgb(0.97, 0.98, 1), subview: rgb(0.94, 0.97, 1),
  accent: rgb(0.10, 0.28, 0.70), white: rgb(1, 1, 1), navigation: rgb(0.38, 0.46, 0.60),
};

function drawLine(page, start, end, {color = palette.line, thickness = 1.3, dashArray} = {}) {
  page.drawLine({start, end, thickness, color, dashArray});
}

function arrow(page, from, to, options = {}) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = 8;
  const spread = Math.PI / 7;
  drawLine(page, to, {x: to.x - length * Math.cos(angle - spread), y: to.y - length * Math.sin(angle - spread)}, options);
  drawLine(page, to, {x: to.x - length * Math.cos(angle + spread), y: to.y - length * Math.sin(angle + spread)}, options);
}

function roundedCard(page, card) {
  const radius = 11;
  page.drawSvgPath(`M ${radius} 0 H ${card.width - radius} Q ${card.width} 0 ${card.width} ${radius} V ${card.height - radius} Q ${card.width} ${card.height} ${card.width - radius} ${card.height} H ${radius} Q 0 ${card.height} 0 ${card.height - radius} V ${radius} Q 0 0 ${radius} 0 Z`, {
    x: card.x, y: card.y + card.height,
    color: card.kind === 'subview' ? palette.subview : palette.fill,
    borderColor: card.kind === 'subview' ? palette.line : palette.accent,
    borderWidth: card.kind === 'subview' ? 1.5 : 2.2,
    borderDashArray: card.kind === 'subview' ? [6, 4] : undefined,
  });
}

function dashedRectangle(page, {x, y, width, height}) {
  const options = {color: palette.navigation, thickness: 1, dashArray: [4, 3]};
  drawLine(page, {x, y}, {x: x + width, y}, options);
  drawLine(page, {x: x + width, y}, {x: x + width, y: y + height}, options);
  drawLine(page, {x: x + width, y: y + height}, {x, y: y + height}, options);
  drawLine(page, {x, y: y + height}, {x, y}, options);
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

function navigationPath(relation, index, count, page) {
  const source = relation.from;
  const target = relation.to;
  const targetOnRight = target.x + target.width / 2 > page.width / 2;
  const lane = Math.floor(index / 2);
  const laneX = targetOnRight ? page.width - page.margin + 12 + lane * 14 : page.margin - 12 - lane * 14;
  const startX = source.x + 24 + (index + 1) * (source.width - 48) / (count + 1);
  const start = {x: startX, y: source.y};
  const routeY = source.y - 22 - index * 14;
  const end = {
    x: targetOnRight ? target.x + target.width : target.x,
    y: target.y + target.height - 24,
  };
  return [start, {x: start.x, y: routeY}, {x: laneX, y: routeY}, {x: laneX, y: end.y}, end];
}

function itemTarget(card, kind, item) {
  if (card.kind === 'view') return kind === 'action'
    ? `ui.action.${card.id}.${item.id}`
    : `ui.info.${card.id}.${item.id}`;
  return kind === 'action'
    ? `ui.subview-action.${card.id}.${item.id}`
    : `ui.subview-info.${card.id}.${item.id}`;
}

function fittedSize(font, text, preferred, maxWidth) {
  let size = preferred;
  while (size > 6.5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25;
  return size;
}

export async function renderUiPdf({layout, requirements, output}) {
  const document = await PDFDocument.create();
  document.setTitle('CPU UI');
  document.setCreator('@cpu-model/devmodel native PDF renderer');
  const page = document.addPage([layout.page.width, layout.page.height]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const annots = document.context.obj([]);
  page.node.set(PDFName.of('Annots'), annots);
  page.drawText('UI', {x: layout.page.margin, y: layout.page.height - 38, size: 10, font: bold, color: palette.accent});

  const navOptions = {color: palette.navigation, thickness: 1, dashArray: [5, 4]};
  for (const [relationIndex, relation] of layout.navigation.entries()) {
    const points = navigationPath(relation, relationIndex, layout.navigation.length, layout.page);
    for (let index = 1; index < points.length; index += 1) drawLine(page, points[index - 1], points[index], navOptions);
    arrow(page, points.at(-2), points.at(-1), navOptions);
  }

  for (const card of layout.cards) {
    roundedCard(page, card);
    page.drawText(card.name, {x: card.x + 18, y: card.y + card.height - 28, size: 12, font: bold, color: palette.ink});
    const cardTarget = card.kind === 'view' ? `ui.view.${card.id}` : `ui.subview.${card.id}`;
    if (requirements[cardTarget]) addTextAnnotation(document, annots, {
      rect: [card.x + card.width - 22, card.y + card.height - 22, card.x + card.width - 8, card.y + card.height - 8],
      title: card.name, contents: requirements[cardTarget],
    });

    const columns = [
      {kind: 'action', items: card.actions || [], x: card.x + 20},
      {kind: 'information', items: card.information || [], x: card.x + card.width / 2 + 8},
    ];
    for (const column of columns) {
      column.items.forEach((item, index) => {
        const y = card.y + card.height - 58 - index * 25;
        if (column.kind === 'action') {
          page.drawSvgPath('M 0 0 L 9 4.5 L 0 9 Z', {x: column.x, y: y + 7, color: palette.accent});
        } else {
          page.drawCircle({x: column.x + 4.5, y: y + 2.5, size: 4.5, color: palette.accent});
        }
        const labelX = column.x + 16;
        const columnWidth = card.width / 2 - 28;
        const labelSize = fittedSize(font, item.name, 9.5, columnWidth - 30);
        page.drawText(item.name, {x: labelX, y: y - 1, size: labelSize, font, color: palette.ink});
        const target = itemTarget(card, column.kind, item);
        if (requirements[target]) {
          addTextAnnotation(document, annots, {
            rect: [column.x + columnWidth - 14, y - 3, column.x + columnWidth, y + 11],
            title: item.name, contents: requirements[target],
          });
        }
      });
    }

    const includeY = card.y + 18;
    for (const [index, include] of (card.includes || []).entries()) {
      const subview = layout.cards.find(item => item.kind === 'subview' && item.id === include);
      const box = {x: card.x + 20 + (index % 2) * 154, y: includeY + Math.floor(index / 2) * 30, width: 140, height: 23};
      dashedRectangle(page, box);
      page.drawText(subview.name, {x: box.x + 8, y: box.y + 7, size: 8.5, font, color: palette.ink});
      // The included SubView is annotated once on its own card. Repeating its
      // annotation on every include would create multiple markers for one element.
    }
  }

  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, await document.save({useObjectStreams: false}));
}
