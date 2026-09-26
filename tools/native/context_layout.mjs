const PAGE = {width: 842, height: 595, margin: 54};
const NODE = {width: 168, height: 110};

function distribute(count, low, high) {
  if (count === 0) return [];
  if (count === 1) return [(low + high) / 2];
  return Array.from({length: count}, (_, index) => low + index * (high - low) / (count - 1));
}

function edgePort(node, side, slot, count) {
  if (side === 'top' || side === 'bottom') {
    const xs = distribute(count, node.x + 26, node.x + node.width - 26);
    return {x: xs[slot], y: side === 'top' ? node.y + node.height : node.y};
  }
  const ys = distribute(count, node.y + 24, node.y + node.height - 24);
  return {x: side === 'right' ? node.x + node.width : node.x, y: ys[slot]};
}

function quadrantPort(node, verticalSide, horizontalSide, slot, count) {
  const midpoint = node.x + node.width / 2;
  const low = horizontalSide === 'left' ? node.x + 18 : midpoint + 10;
  const high = horizontalSide === 'left' ? midpoint - 10 : node.x + node.width - 18;
  const xs = distribute(count, low, high);
  return {x: xs[slot], y: verticalSide === 'top' ? node.y + node.height : node.y};
}

export function layoutContext(context) {
  const left = context.parties.filter((_, index) => index % 2 === 0);
  const right = context.parties.filter((_, index) => index % 2 === 1);
  const nodes = new Map();
  const system = {
    id: context.system.id, kind: 'system', name: context.system.name,
    x: (PAGE.width - NODE.width) / 2, y: (PAGE.height - NODE.height) / 2 + 18, ...NODE,
  };
  nodes.set(system.id, system);
  for (const [column, parties] of [['left', left], ['right', right]]) {
    const ys = distribute(parties.length, PAGE.margin + 52, PAGE.height - PAGE.margin - NODE.height).reverse();
    parties.forEach((party, index) => nodes.set(party.id, {
      ...party, kind: party.type,
      x: column === 'left' ? PAGE.margin : PAGE.width - PAGE.margin - NODE.width,
      y: ys[index], ...NODE,
    }));
  }

  const byParty = new Map();
  for (const flow of context.flows) {
    const partyId = flow.from === system.id ? flow.to : flow.from;
    if (!byParty.has(partyId)) byParty.set(partyId, []);
    byParty.get(partyId).push(flow);
  }
  for (const flows of byParty.values()) flows.sort((a, b) => a.id.localeCompare(b.id));

  const flows = context.flows.map(flow => {
    const partyId = flow.from === system.id ? flow.to : flow.from;
    const party = nodes.get(partyId);
    const group = byParty.get(partyId);
    const slot = group.indexOf(flow);
    const partyIsLeft = party.x < system.x;
    const partyIsAbove = party.y + party.height / 2 > system.y + system.height / 2;
    const partyPort = edgePort(party, partyIsLeft ? 'right' : 'left', slot, group.length);
    const systemSlot = partyIsLeft === partyIsAbove ? slot : group.length - 1 - slot;
    const systemPort = quadrantPort(system, partyIsAbove ? 'top' : 'bottom', partyIsLeft ? 'left' : 'right', systemSlot, group.length);
    const start = flow.from === system.id ? systemPort : partyPort;
    const end = flow.to === system.id ? systemPort : partyPort;
    const knee = {x: systemPort.x, y: partyPort.y};
    const labelRatio = 0.5;
    const midpoint = {x: partyPort.x + (knee.x - partyPort.x) * labelRatio, y: partyPort.y};
    return {
      ...flow,
      points: flow.from === system.id ? [start, knee, end] : [start, knee, end],
      label: {x: midpoint.x, y: midpoint.y + (partyIsAbove ? 12 : -12)},
      annotationSide: 'above',
    };
  });
  return {page: PAGE, nodes: [...nodes.values()], flows};
}
