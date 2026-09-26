const PAGE = {width: 842, margin: 54};
const CARD = {width: 344, minHeight: 126, gapX: 46, gapY: 42};

function cardHeight(item) {
  const contentRows = Math.max((item.actions || []).length, (item.information || []).length);
  const includeRows = Math.ceil((item.includes || []).length / 2);
  return Math.max(CARD.minHeight, 72 + contentRows * 28 + includeRows * 30);
}

function sectionHeight(items) {
  let height = 0;
  for (let index = 0; index < items.length; index += 2) {
    height += Math.max(...items.slice(index, index + 2).map(cardHeight));
    if (index + 2 < items.length) height += CARD.gapY;
  }
  return height;
}

function placeSection(items, topY, kind) {
  const placed = [];
  let top = topY;
  for (let index = 0; index < items.length; index += 2) {
    const row = items.slice(index, index + 2);
    const height = Math.max(...row.map(cardHeight));
    row.forEach((item, column) => {
      const x = row.length === 1 ? (PAGE.width - CARD.width) / 2 : PAGE.margin + column * (CARD.width + CARD.gapX);
      placed.push({...item, kind, x, y: top - height, width: CARD.width, height});
    });
    top -= height + CARD.gapY;
  }
  return placed;
}

export function layoutUi(ui) {
  const subHeight = sectionHeight(ui.subviews);
  const viewHeight = sectionHeight(ui.views);
  const between = ui.subviews.length && ui.views.length ? 132 : 0;
  const pageHeight = Math.max(595, PAGE.margin + 54 + subHeight + between + viewHeight + PAGE.margin);
  const subviews = placeSection(ui.subviews, pageHeight - 72, 'subview');
  const views = placeSection(ui.views, pageHeight - 72 - subHeight - between, 'view');
  const cards = [...subviews, ...views];
  const byId = new Map(cards.map(item => [item.id, item]));
  const navigation = [];
  for (const source of cards) {
    for (const entry of source.navigation || []) navigation.push({from: source, to: byId.get(entry.to)});
  }
  return {page: {...PAGE, height: pageHeight}, cards, navigation};
}
