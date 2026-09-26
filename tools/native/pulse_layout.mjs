const PAGE = {margin: 54};
const BEHAVIOR = {width: 170, height: 62};
const TRIGGER = {width: 174, height: 86};
const NODE_GAP = 40;
const LEGEND_ROW = 18;
export const PULSE_RADIUS = 14;
export const PULSE_LINE_CLEARANCE = 28;
export const MIN_PORT_SPACING = PULSE_RADIUS * 2 + PULSE_LINE_CLEARANCE * 2;
export const MIN_CHANNEL_SPACING = 36;
export const MIN_LINE_SPACING = 18;
export const MIN_SIDE_CLEARANCE = 60;
const PORT_PADDING = 24;
const MIN_NODE_CLEARANCE = 28;

function behaviorDepths(pulse) {
  const depth = new Map();
  for (const flow of pulse.flows) {
    if ('trigger' in flow) depth.set(flow.to, Math.max(1, depth.get(flow.to) || 0));
  }
  for (let pass = 0; pass < pulse.behaviors.length; pass += 1) {
    let changed = false;
    for (const flow of pulse.flows) {
      if (!('from' in flow) || !depth.has(flow.from)) continue;
      const candidate = depth.get(flow.from) + 1;
      if (candidate > (depth.get(flow.to) || 0)) { depth.set(flow.to, candidate); changed = true; }
    }
    if (!changed) break;
  }
  for (const behavior of pulse.behaviors) if (!depth.has(behavior.id)) depth.set(behavior.id, 1);
  return depth;
}

function port(node, slot, count, side) {
  const spacing = count > 1 ? MIN_PORT_SPACING : 0;
  return {
    x: side === 'out' ? node.x + node.width : node.x,
    y: node.y + node.height / 2 + (slot - (count - 1) / 2) * spacing,
  };
}

function segmentIntersectsBox(start, end, box, padding = 10) {
  const minX = box.x - padding;
  const maxX = box.x + box.width + padding;
  const minY = box.y - padding;
  const maxY = box.y + box.height + padding;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let low = 0;
  let high = 1;
  for (const [origin, delta, minimum, maximum] of [
    [start.x, dx, minX, maxX],
    [start.y, dy, minY, maxY],
  ]) {
    if (delta === 0) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    low = Math.max(low, Math.min(first, second));
    high = Math.min(high, Math.max(first, second));
    if (low > high) return false;
  }
  return high >= 0 && low <= 1;
}

export function layoutPulse(pulse, options = {}) {
  const eventById = new Map(pulse.pulses.map(item => [item.id, item]));
  const semanticFlowKey = flow => `${'trigger' in flow ? `trigger:${flow.trigger}` : `from:${flow.from}`}\u0000${flow.pulse}\u0000${flow.to}`;
  const triggers = [...new Set(pulse.flows.filter(flow => 'trigger' in flow).map(flow => flow.trigger))];
  const depths = behaviorDepths(pulse);
  const maxDepth = Math.max(1, ...depths.values());
  const behaviorLevels = Array.from({length: maxDepth}, (_, i) => pulse.behaviors.filter(item => depths.get(item.id) === i + 1));
  const levels = [triggers.map(name => ({id: `trigger:${name}`, name})), ...behaviorLevels.map(items => [...items])];
  const predecessorIds = id => pulse.flows.filter(flow => flow.to === id)
    .map(flow => 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from);
  const successorIds = id => pulse.flows.filter(flow => ('trigger' in flow ? `trigger:${flow.trigger}` : flow.from) === id).map(flow => flow.to);
  const order = () => new Map(levels.flatMap(items => items.map((item, index) => [item.id, index])));
  const averageOrder = (ids, positions, fallback) => {
    const values = ids.map(id => positions.get(id)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  };
  for (let pass = 0; pass < 8; pass += 1) {
    let positions = order();
    for (let level = 1; level < levels.length; level += 1) {
      levels[level].sort((a, b) => averageOrder(predecessorIds(a.id), positions, positions.get(a.id))
        - averageOrder(predecessorIds(b.id), positions, positions.get(b.id)));
      positions = order();
    }
    for (let level = levels.length - 2; level >= 0; level -= 1) {
      positions = order();
      levels[level].sort((a, b) => averageOrder(successorIds(a.id), positions, positions.get(a.id))
        - averageOrder(successorIds(b.id), positions, positions.get(b.id)));
    }
  }
  if (options.triggerOrder) {
    const triggerPosition = new Map(options.triggerOrder.map((id, index) => [id, index]));
    levels[0].sort((a, b) => triggerPosition.get(a.id) - triggerPosition.get(b.id));
  }
  if (options.levelOrders) {
    for (const [levelText, ids] of Object.entries(options.levelOrders)) {
      const level = Number(levelText);
      const positions = new Map(ids.map((id, index) => [id, index]));
      levels[level]?.sort((a, b) => positions.get(a.id) - positions.get(b.id));
    }
  }
  const incoming = new Map();
  const outgoing = new Map();
  for (const flow of pulse.flows) {
    const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
    if (!outgoing.has(sourceId)) outgoing.set(sourceId, []);
    if (!incoming.has(flow.to)) incoming.set(flow.to, []);
    outgoing.get(sourceId).push(flow);
    incoming.get(flow.to).push(flow);
  }
  const nodeHeight = id => {
    const portCount = Math.max(incoming.get(id)?.length || 0, outgoing.get(id)?.length || 0);
    return Math.max(BEHAVIOR.height, PORT_PADDING * 2 + Math.max(0, portCount - 1) * MIN_PORT_SPACING);
  };
  const levelHeights = levels.map((items, level) => items.reduce((sum, item) => {
    const id = item.id;
    return sum + (level === 0 ? TRIGGER.height : nodeHeight(id));
  }, 0) + Math.max(0, items.length - 1) * NODE_GAP);
  const graphHeight = Math.max(...levelHeights);
  const legendColumns = 3;
  const legendHeight = Math.ceil(pulse.pulses.length / legendColumns) * LEGEND_ROW + 42;
  const sourceLevel = flow => 'trigger' in flow ? 0 : depths.get(flow.from);
  const flowsBySourceLevel = new Map();
  for (const flow of pulse.flows) {
    const level = sourceLevel(flow);
    if (!flowsBySourceLevel.has(level)) flowsBySourceLevel.set(level, []);
    flowsBySourceLevel.get(level).push(flow);
  }
  for (const group of flowsBySourceLevel.values()) group.sort((a, b) => a.pulse.localeCompare(b.pulse));
  const gapForLevel = level => {
    const channelCount = flowsBySourceLevel.get(level)?.length || 0;
    const nextLevel = levels[level + 1] || [];
    const largestIncomingSide = Math.max(0, ...nextLevel.map(item => incoming.get(item.id)?.length || 0));
    const targetApproachWidth = MIN_SIDE_CLEARANCE * 2
      + Math.max(0, largestIncomingSide - 1) * MIN_CHANNEL_SPACING;
    return Math.max(190, 96 + Math.max(0, channelCount - 1) * MIN_CHANNEL_SPACING,
      targetApproachWidth);
  };
  const columnGaps = Array.from({length: maxDepth}, (_, level) => gapForLevel(level));
  const pageWidth = PAGE.margin * 2 + TRIGGER.width + maxDepth * BEHAVIOR.width
    + columnGaps.reduce((sum, gap) => sum + gap, 0);
  const pageHeight = Math.max(595, PAGE.margin + 44 + graphHeight + 54 + legendHeight + PAGE.margin);
  const graphTop = pageHeight - 78;
  const graphBottom = graphTop - graphHeight;
  const nodes = new Map();

  function place(items, level) {
    const width = level === 0 ? TRIGGER.width : BEHAVIOR.width;
    const x = level === 0
      ? PAGE.margin
      : PAGE.margin + TRIGGER.width + columnGaps.slice(0, level).reduce((sum, gap) => sum + gap, 0)
        + (level - 1) * BEHAVIOR.width;
    const usedHeight = levelHeights[level];
    let top = graphTop - (graphHeight - usedHeight) / 2;
    items.forEach((item, index) => {
      const id = item.id;
      const height = level === 0 ? TRIGGER.height : nodeHeight(id);
      nodes.set(id, {
        ...item, id, kind: level === 0 ? 'trigger' : 'behavior',
        x, y: top - height, width, height,
      });
      top -= height + NODE_GAP;
    });
  }
  levels.forEach(place);
  const centerY = node => node.y + node.height / 2;

  // Prefer vertical alignment with predecessor elements. Packing constraints
  // preserve element spacing while allowing a level to move as a unit.
  for (let level = 1; level < levels.length; level += 1) {
    const levelNodes = levels[level].map(item => nodes.get(item.id)).sort((a, b) => a.y - b.y);
    const desiredCenter = node => {
      const sources = pulse.flows.filter(flow => flow.to === node.id)
        .map(flow => nodes.get('trigger' in flow ? `trigger:${flow.trigger}` : flow.from));
      return sources.length
        ? sources.reduce((sum, source) => sum + centerY(source), 0) / sources.length
        : centerY(node);
    };
    let floor = graphBottom;
    for (const node of levelNodes) {
      const center = Math.max(desiredCenter(node), floor + node.height / 2);
      node.y = center - node.height / 2;
      floor = node.y + node.height + NODE_GAP;
    }
    let ceiling = graphTop;
    for (const node of [...levelNodes].reverse()) {
      if (node.y + node.height > ceiling) node.y = ceiling - node.height;
      ceiling = node.y - NODE_GAP;
    }
    floor = graphBottom;
    for (const node of levelNodes) {
      if (node.y < floor) node.y = floor;
      floor = node.y + node.height + NODE_GAP;
    }
  }

  for (const [sourceId, list] of outgoing) {
    list.sort((a, b) => {
      const targetDifference = centerY(nodes.get(a.to)) - centerY(nodes.get(b.to));
      return targetDifference || a.pulse.localeCompare(b.pulse);
    });
  }
  for (const [targetId, list] of incoming) {
    list.sort((a, b) => {
      const sourceId = flow => 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
      const sourceY = flow => {
        const id = sourceId(flow);
        const source = nodes.get(id);
        const connections = outgoing.get(id);
        return port(source, connections.indexOf(flow), connections.length, 'out').y;
      };
      const sourceDifference = sourceY(a) - sourceY(b);
      return sourceDifference || a.pulse.localeCompare(b.pulse);
    });
  }
  if (options.outgoingOrders) {
    for (const [sourceId, keys] of Object.entries(options.outgoingOrders)) {
      const positions = new Map(keys.map((key, index) => [key, index]));
      outgoing.get(sourceId)?.sort((a, b) => positions.get(semanticFlowKey(a)) - positions.get(semanticFlowKey(b)));
    }
  }

  const sourceIdOf = flow => 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
  const provisionalSourcePort = flow => {
    const sourceId = sourceIdOf(flow);
    const source = nodes.get(sourceId);
    const connections = outgoing.get(sourceId);
    return port(source, connections.indexOf(flow), connections.length, 'out');
  };

  // A one-in/one-out relay is moved to the actual predecessor port, not merely
  // to the predecessor box centre. This permits both adjacent connections to
  // share one horizontal axis when their other endpoints allow it.
  for (const node of nodes.values()) {
    const ins = incoming.get(node.id) || [];
    const outs = outgoing.get(node.id) || [];
    if (node.kind !== 'behavior' || ins.length !== 1 || outs.length > 1) continue;
    const desiredY = provisionalSourcePort(ins[0]).y - node.height / 2;
    const peers = [...nodes.values()].filter(peer => peer.id !== node.id && peer.x === node.x);
    const clear = peers.every(peer => desiredY + node.height + NODE_GAP <= peer.y
      || desiredY >= peer.y + peer.height + NODE_GAP);
    if (clear && desiredY >= graphBottom && desiredY + node.height <= graphTop) node.y = desiredY;
  }

  // Extend a target into free vertical space so incoming ports can adopt their
  // source heights. Neighbouring boxes bound the extension; lack of room for
  // one extreme connection must not prevent useful extension in the other
  // direction.
  for (const node of nodes.values()) {
    const ins = incoming.get(node.id) || [];
    if (node.kind !== 'behavior' || ins.length < 2) continue;
    const desired = ins.map(provisionalSourcePort).map(point => point.y).sort((a, b) => a - b);
    const peers = [...nodes.values()].filter(peer => peer.id !== node.id && peer.x === node.x);
    const lowerBound = Math.max(graphBottom, ...peers
      .filter(peer => centerY(peer) < centerY(node))
      .map(peer => peer.y + peer.height + NODE_GAP));
    const upperBound = Math.min(graphTop, ...peers
      .filter(peer => centerY(peer) > centerY(node))
      .map(peer => peer.y - NODE_GAP));
    const proposedBottom = Math.max(lowerBound, Math.min(node.y, desired[0] - PORT_PADDING));
    const proposedTop = Math.min(upperBound, Math.max(node.y + node.height, desired.at(-1) + PORT_PADDING));
    if (proposedTop > proposedBottom && proposedTop - proposedBottom > node.height) {
      node.y = proposedBottom;
      node.height = proposedTop - proposedBottom;
    }
  }

  // Nudge a whole receiving element when translating all ports on its side
  // creates additional straight incoming connections. Moving the element as a
  // unit preserves port spacing; the rule is evaluated from geometry only.
  const collectiveNodeMoves = options.optimizePorts !== false
    && !(options.optimizeTriggers !== false && !options.triggerOrder && levels[0].length > 2);
  for (const node of nodes.values()) {
    const ins = incoming.get(node.id) || [];
    if (node.kind !== 'behavior' || !ins.length) continue;
    const targetPortY = flow => port(node, ins.indexOf(flow), ins.length, 'in').y;
    const deltas = [0, ...ins.map(flow => provisionalSourcePort(flow).y - targetPortY(flow))];
    const score = delta => {
      const column = [...nodes.values()].filter(peer => peer.x === node.x).sort((a, b) => a.y - b.y);
      const positions = new Map(column.map(peer => [peer.id, peer.y]));
      positions.set(node.id, node.y + delta);
      const nodeIndex = column.findIndex(peer => peer.id === node.id);
      if (!collectiveNodeMoves && column.some(peer => peer.id !== node.id
        && !(positions.get(node.id) + node.height + NODE_GAP <= peer.y
          || positions.get(node.id) >= peer.y + peer.height + NODE_GAP))) {
        return {value: Number.NEGATIVE_INFINITY, positions};
      }
      if (collectiveNodeMoves && delta < 0) {
        for (let index = nodeIndex - 1; index >= 0; index -= 1) {
          const lower = column[index];
          const upper = column[index + 1];
          positions.set(lower.id, Math.min(positions.get(lower.id),
            positions.get(upper.id) - MIN_NODE_CLEARANCE - lower.height));
        }
      } else if (collectiveNodeMoves && delta > 0) {
        for (let index = nodeIndex + 1; index < column.length; index += 1) {
          const lower = column[index - 1];
          const upper = column[index];
          positions.set(upper.id, Math.max(positions.get(upper.id),
            positions.get(lower.id) + lower.height + MIN_NODE_CLEARANCE));
        }
      }
      if (column.some(peer => positions.get(peer.id) < graphBottom
        || positions.get(peer.id) + peer.height > graphTop)) {
        return {value: Number.NEGATIVE_INFINITY, positions};
      }
      const moved = {...node, y: positions.get(node.id)};
      let aligned = 0;
      let mismatch = 0;
      for (const flow of ins) {
        const sourceId = sourceIdOf(flow);
        const start = provisionalSourcePort(flow);
        const endY = targetPortY(flow) + delta;
        mismatch += Math.abs(start.y - endY);
        if (Math.abs(start.y - endY) > 0.01) continue;
        const end = {x: moved.x, y: endY};
        const clear = [...nodes.values()].every(other => other.id === sourceId || other.id === node.id
          || !segmentIntersectsBox(start, end,
            {...other, y: positions.get(other.id) ?? other.y},
            collectiveNodeMoves ? 10 : MIN_SIDE_CLEARANCE - 0.01));
        if (clear) aligned += 1;
      }
      const movement = column.reduce((sum, peer) => sum + Math.abs(positions.get(peer.id) - peer.y), 0);
      return {value: aligned * 10000 - mismatch - movement, positions};
    };
    let best = score(0);
    for (const delta of deltas) {
      const candidate = score(delta);
      if (candidate.value > best.value) best = candidate;
    }
    for (const [id, y] of best.positions) nodes.get(id).y = y;
  }

  const routed = pulse.flows.map(flow => {
    const sourceId = sourceIdOf(flow);
    const source = nodes.get(sourceId);
    const target = nodes.get(flow.to);
    const outs = outgoing.get(sourceId);
    const ins = incoming.get(flow.to);
    const start = port(source, outs.indexOf(flow), outs.length, 'out');
    const end = port(target, ins.indexOf(flow), ins.length, 'in');
    const group = flowsBySourceLevel.get(sourceLevel(flow));
    const channel = group.indexOf(flow);
    const midX = start.x + MIN_SIDE_CLEARANCE + 18 + channel * MIN_CHANNEL_SPACING;
    return {flow, sourceId, source, target, start, end, midX, direct: false};
  });

  const endpointsBySide = new Map();
  for (const item of routed) {
    const sourceSide = `${item.sourceId}:out`;
    const targetSide = `${item.flow.to}:in`;
    if (!endpointsBySide.has(sourceSide)) endpointsBySide.set(sourceSide, []);
    if (!endpointsBySide.has(targetSide)) endpointsBySide.set(targetSide, []);
    endpointsBySide.get(sourceSide).push({flow: item.flow, point: item.start});
    endpointsBySide.get(targetSide).push({flow: item.flow, point: item.end});
  }
  const candidateFits = (side, flow, y) => endpointsBySide.get(side)
    .every(entry => entry.flow === flow || Math.abs(entry.point.y - y) >= MIN_PORT_SPACING);
  for (const item of routed) {
    const low = Math.max(item.source.y + PORT_PADDING, item.target.y + PORT_PADDING);
    const high = Math.min(item.source.y + item.source.height - PORT_PADDING,
      item.target.y + item.target.height - PORT_PADDING);
    if (low > high) continue;
    const preferred = Math.max(low, Math.min(high, (centerY(item.source) + centerY(item.target)) / 2));
    // Either endpoint may move along its side. Trying both existing endpoint
    // heights first makes this symmetric instead of favoring the target side.
    const candidates = [item.start.y, item.end.y, preferred];
    for (let offset = 6; offset <= high - low; offset += 6) candidates.push(preferred - offset, preferred + offset);
    const y = candidates.find(value => value >= low && value <= high
      && candidateFits(`${item.sourceId}:out`, item.flow, value)
      && candidateFits(`${item.flow.to}:in`, item.flow, value)
      && [...nodes.values()].every(node => node.id === item.sourceId || node.id === item.flow.to
        || !segmentIntersectsBox({x: item.start.x, y: value}, {x: item.end.x, y: value}, node)));
    if (y === undefined) continue;
    item.start.y = y;
    item.end.y = y;
    item.direct = true;
  }

  // A connection with unequal endpoint heights normally needs only two knees:
  // horizontal, vertical, horizontal. Reserve these minimal routes first. The
  // longer track allocator below is only a fallback when an element or another
  // line makes the minimal route unsafe.
  const minimalReservations = routed.filter(item => item.direct)
    .map(item => ({x1: item.start.x, x2: item.end.x, y: item.start.y}));
  const verticalReservations = [];
  const intervalsOverlap = (a1, a2, b1, b2) => Math.min(Math.max(a1, a2), Math.max(b1, b2))
    - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 0.01;
  const horizontalRouteIsClear = (x1, x2, y, item) => [...nodes.values()].every(node =>
    node.id === item.sourceId || node.id === item.flow.to
      || !segmentIntersectsBox({x: x1, y}, {x: x2, y}, node));
  for (const item of routed.filter(item => !item.direct)) {
    const minimumX = item.start.x + MIN_SIDE_CLEARANCE;
    const maximumX = item.end.x - MIN_SIDE_CLEARANCE;
    if (minimumX > maximumX) continue;
    const bendX = Math.max(minimumX, Math.min(maximumX, item.midX));
    const legs = [
      {x1: item.start.x, x2: bendX, y: item.start.y},
      {x1: bendX, x2: item.end.x, y: item.end.y},
    ];
    const conflicts = legs.some(leg => !horizontalRouteIsClear(leg.x1, leg.x2, leg.y, item)
      || minimalReservations.some(other => intervalsOverlap(leg.x1, leg.x2, other.x1, other.x2)
        && Math.abs(leg.y - other.y) < MIN_LINE_SPACING));
    if (conflicts) continue;
    item.minimalBendX = bendX;
    minimalReservations.push(...legs);
    verticalReservations.push({x: bendX, y1: item.start.y, y2: item.end.y});
  }

  const routeTracks = new Map();
  const targetApproaches = new Map();
  for (const item of routed.filter(item => !item.direct && item.minimalBendX === undefined)) {
    if (!targetApproaches.has(item.end.x)) targetApproaches.set(item.end.x, []);
    targetApproaches.get(item.end.x).push(item);
  }
  for (const group of targetApproaches.values()) {
    group.sort((a, b) => a.end.y - b.end.y || a.flow.pulse.localeCompare(b.flow.pulse));
    group.forEach((item, index) => { item.targetEscapeX = item.end.x - MIN_SIDE_CLEARANCE - index * MIN_CHANNEL_SPACING; });
  }
  for (const item of routed.filter(item => !item.direct && item.minimalBendX === undefined)) {
    item.sourceEscapeX = item.midX;
  }
  const reservations = [...minimalReservations, ...routed.filter(item => !item.direct && item.minimalBendX === undefined).flatMap(item => [
    {x1: item.start.x, x2: item.sourceEscapeX, y: item.start.y},
    {x1: item.targetEscapeX, x2: item.end.x, y: item.end.y},
  ])];
  const requests = routed.filter(item => !item.direct && item.minimalBendX === undefined).map(item => ({
    item,
    baseY: (item.start.y + item.end.y) / 2,
    x1: item.sourceEscapeX,
    x2: item.targetEscapeX,
  })).sort((a, b) => a.baseY - b.baseY || a.item.flow.pulse.localeCompare(b.item.flow.pulse));
  for (const request of requests) {
    let best = {score: Number.POSITIVE_INFINITY, y: request.baseY};
    for (let step = 0; step < 240; step += 1) {
      const trackY = request.baseY + (step === 0 ? 0
        : (step % 2 ? 1 : -1) * Math.ceil(step / 2) * MIN_LINE_SPACING);
      if ([...nodes.values()].some(node => node.id !== request.item.sourceId && node.id !== request.item.flow.to
        && segmentIntersectsBox({x: request.x1, y: trackY}, {x: request.x2, y: trackY}, node))) continue;
      const parallelConflicts = reservations.filter(other => intervalsOverlap(request.x1, request.x2, other.x1, other.x2)
        && Math.abs(trackY - other.y) < MIN_LINE_SPACING).length;
      const endpointCrossings = reservations.filter(other => {
        const crossesSource = request.x1 > Math.min(other.x1, other.x2)
          && request.x1 < Math.max(other.x1, other.x2)
          && other.y > Math.min(request.item.start.y, trackY)
          && other.y < Math.max(request.item.start.y, trackY);
        const crossesTarget = request.x2 > Math.min(other.x1, other.x2)
          && request.x2 < Math.max(other.x1, other.x2)
          && other.y > Math.min(trackY, request.item.end.y)
          && other.y < Math.max(trackY, request.item.end.y);
        return crossesSource || crossesTarget;
      }).length;
      const trackCrossings = verticalReservations.filter(other => trackY > Math.min(other.y1, other.y2)
        && trackY < Math.max(other.y1, other.y2)
        && other.x > Math.min(request.x1, request.x2)
        && other.x < Math.max(request.x1, request.x2)).length;
      const score = endpointCrossings * 1000000 + trackCrossings * 10000 + parallelConflicts * 100
        + Math.abs(trackY - request.baseY);
      if (score < best.score) best = {score, y: trackY};
      if (score === 0) break;
    }
    const trackY = best.y;
    reservations.push({x1: request.x1, x2: request.x2, y: trackY});
    verticalReservations.push(
      {x: request.x1, y1: request.item.start.y, y2: trackY},
      {x: request.x2, y1: trackY, y2: request.item.end.y},
    );
    routeTracks.set(request.item.flow, trackY);
  }

  const targetEscapeByRoute = new Map(routed
    .filter(item => item.targetEscapeX !== undefined)
    .map(item => [semanticFlowKey(item.flow), item.targetEscapeX]));

  const flows = routed.map(({flow, start, end, midX, targetEscapeX, direct, minimalBendX, sourceEscapeX}) => {
    if (direct) {
      return {
        ...flow, event: eventById.get(flow.pulse), points: [start, end],
        symbol: {x: start.x + 18, y: start.y},
        annotation: {x: start.x + 33, y: start.y + 5},
      };
    }
    if (minimalBendX !== undefined) {
      return {
        ...flow, event: eventById.get(flow.pulse),
        points: [start, {x: minimalBendX, y: start.y}, {x: minimalBendX, y: end.y}, end],
        symbol: {x: start.x + 18, y: start.y}, annotation: {x: start.x + 33, y: start.y + 5},
      };
    }
    const trackY = routeTracks.get(flow);
    const points = [
      start,
      {x: sourceEscapeX, y: start.y},
      {x: sourceEscapeX, y: trackY},
      {x: targetEscapeX, y: trackY},
      {x: targetEscapeX, y: end.y},
      end,
    ];
    return {
      ...flow, event: eventById.get(flow.pulse), points,
      symbol: {x: start.x + 18, y: start.y}, annotation: {x: start.x + 33, y: start.y + 5},
    };
  });

  const properCrossing = (a, b, c, d) => {
    const aHorizontal = a.y === b.y;
    const cHorizontal = c.y === d.y;
    if (aHorizontal === cHorizontal) return false;
    const horizontal = aHorizontal ? {a, b} : {a: c, b: d};
    const vertical = aHorizontal ? {a: c, b: d} : {a, b};
    return vertical.a.x > Math.min(horizontal.a.x, horizontal.b.x)
      && vertical.a.x < Math.max(horizontal.a.x, horizontal.b.x)
      && horizontal.a.y > Math.min(vertical.a.y, vertical.b.y)
      && horizontal.a.y < Math.max(vertical.a.y, vertical.b.y);
  };
  const flowsCross = (left, right) => left.points.slice(1).some((point, index) =>
    right.points.slice(1).some((other, otherIndex) =>
      properCrossing(left.points[index], point, right.points[otherIndex], other)));
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
  const flowsOverlap = (left, right) => left.points.slice(1).some((point, index) =>
    right.points.slice(1).some((other, otherIndex) =>
      collinearOverlap(left.points[index], point, right.points[otherIndex], other)));
  const simplify = points => points.filter((point, index) => index === 0
    || point.x !== points[index - 1].x || point.y !== points[index - 1].y)
    .filter((point, index, items) => index === 0 || index === items.length - 1
      || !((items[index - 1].x === point.x && point.x === items[index + 1].x)
        || (items[index - 1].y === point.y && point.y === items[index + 1].y)));
  const willOptimizeOrders = options.optimizeTriggers !== false && !options.triggerOrder && levels[0].length > 2;

  // Connections sharing a target side must preserve their vertical order.
  // If their initial routes cross, compact their ports and nest their target
  // approaches in track order instead of allowing the lines to swap places.
  const rebuiltTargetChannels = new Map();
  for (const [targetId, connections] of incoming) {
    const group = flows.filter(flow => flow.to === targetId);
    if (group.length < 2 || !group.some((flow, index) => group.slice(index + 1)
      .some(other => flowsCross(flow, other) || flowsOverlap(flow, other)))) continue;
    const target = nodes.get(targetId);
    const trackY = flow => flow.points.length >= 6 ? flow.points[2].y : flow.points[0].y;
    const ordered = [...group].sort((a, b) => trackY(a) - trackY(b) || a.pulse.localeCompare(b.pulse));
    const low = target.y + PORT_PADDING;
    const high = target.y + target.height - PORT_PADDING;
    const portYs = ordered.map(flow => Math.max(low, Math.min(high, trackY(flow))));
    for (let index = 1; index < portYs.length; index += 1) {
      portYs[index] = Math.max(portYs[index], portYs[index - 1] + MIN_PORT_SPACING);
    }
    if (portYs.at(-1) > high) {
      portYs[portYs.length - 1] = high;
      for (let index = portYs.length - 2; index >= 0; index -= 1) {
        portYs[index] = Math.min(portYs[index], portYs[index + 1] - MIN_PORT_SPACING);
      }
    }
    const tracks = ordered.map(trackY);
    for (let index = 0; index < tracks.length; index += 1) {
      const flow = ordered[index];
      const start = flow.points[0];
      const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
      const sourceEscapeX = flow.points.length > 2 ? flow.points[1].x : start.x + MIN_SIDE_CLEARANCE;
      const targetEscapeX = target.x - MIN_SIDE_CLEARANCE - index * MIN_CHANNEL_SPACING;
      const validTrack = candidate => !portYs.some((portY, portIndex) => portIndex !== index
        && Math.abs(candidate - portY) < MIN_LINE_SPACING)
        && !tracks.some((other, otherIndex) => otherIndex < index
          && Math.abs(candidate - other) < MIN_LINE_SPACING)
        && [...nodes.values()].every(node => node.id === sourceId || node.id === targetId
          || !segmentIntersectsBox({x: sourceEscapeX, y: candidate}, {x: targetEscapeX, y: candidate},
            node, MIN_SIDE_CLEARANCE));
      const originalTrack = tracks[index];
      // Prefer the target port's axis. This removes the final two knees when
      // the long horizontal segment can approach the target directly.
      if (options.optimizePorts !== false && !willOptimizeOrders && validTrack(portYs[index])) {
        tracks[index] = portYs[index];
      }
      let step = 0;
      while (!validTrack(tracks[index]) && step < 720) {
        step += 1;
        tracks[index] = trackY(flow) + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * 6;
      }
      if (!validTrack(tracks[index])) tracks[index] = originalTrack;
    }
    ordered.forEach((flow, index) => {
      const start = flow.points[0];
      const end = {x: target.x, y: portYs[index]};
      const track = tracks[index];
      const sourceEscapeX = flow.points.length > 2 ? flow.points[1].x : start.x + MIN_SIDE_CLEARANCE;
      let targetEscapeX = targetEscapeByRoute.get(semanticFlowKey(flow))
        ?? end.x - MIN_SIDE_CLEARANCE - index * MIN_CHANNEL_SPACING;
      if (!rebuiltTargetChannels.has(end.x)) rebuiltTargetChannels.set(end.x, new Set());
      const usedChannels = rebuiltTargetChannels.get(end.x);
      while (usedChannels.has(targetEscapeX)) targetEscapeX -= MIN_CHANNEL_SPACING;
      usedChannels.add(targetEscapeX);
      const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
      const blockingRights = [...nodes.values()].filter(node => node.id !== sourceId && node.id !== targetId
        && end.y >= node.y - MIN_SIDE_CLEARANCE
        && end.y <= node.y + node.height + MIN_SIDE_CLEARANCE
        && node.x + node.width + MIN_SIDE_CLEARANCE > sourceEscapeX
        && node.x - MIN_SIDE_CLEARANCE < targetEscapeX)
        .map(node => node.x + node.width + MIN_SIDE_CLEARANCE);
      const directApproachX = Math.max(sourceEscapeX + MIN_SIDE_CLEARANCE, ...blockingRights);
      const approachX = options.optimizePorts !== false && !willOptimizeOrders
        && directApproachX < targetEscapeX ? directApproachX : targetEscapeX;
      flow.points = simplify([
        start,
        {x: sourceEscapeX, y: start.y},
        {x: sourceEscapeX, y: track},
        {x: approachX, y: track},
        {x: approachX, y: end.y},
        end,
      ]);
    });
  }

  // Order search uses the inexpensive single-flow estimate. The selected
  // ordering is rendered once more below with collective side optimization.
  if (options.optimizePorts === false || willOptimizeOrders) {
    for (const flow of flows.filter(item => item.from && item.points.length > 2)) {
      const source = nodes.get(flow.from);
      const target = nodes.get(flow.to);
      const targetY = flow.points.at(-1).y;
      const otherStarts = flows.filter(other => other !== flow && other.from === flow.from)
        .map(other => other.points[0].y);
      if (otherStarts.some(y => Math.abs(y - targetY) < MIN_PORT_SPACING)) continue;
      const proposedBottom = Math.min(source.y, targetY - PORT_PADDING);
      const proposedTop = Math.max(source.y + source.height, targetY + PORT_PADDING);
      if (proposedBottom < graphBottom || proposedTop > graphTop) continue;
      const peers = [...nodes.values()].filter(node => node.id !== source.id && node.x === source.x);
      if (peers.some(peer => !(proposedTop + NODE_GAP <= peer.y
        || proposedBottom >= peer.y + peer.height + NODE_GAP))) continue;
      const start = {x: source.x + source.width, y: targetY};
      const end = {x: target.x, y: targetY};
      if ([...nodes.values()].some(node => node.id !== source.id && node.id !== target.id
        && segmentIntersectsBox(start, end, node, MIN_SIDE_CLEARANCE))) continue;
      const proposedBox = {...source, y: proposedBottom, height: proposedTop - proposedBottom};
      const engulfsLine = flows.some(other => other !== flow && other.from !== source.id && other.to !== source.id
        && other.points.slice(1).some((point, index) =>
          segmentIntersectsBox(other.points[index], point, proposedBox, 0)));
      if (engulfsLine) continue;
      source.y = proposedBottom;
      source.height = proposedTop - proposedBottom;
      flow.points = [start, end];
      flow.symbol = {x: start.x + 18, y: targetY};
      flow.annotation = {x: start.x + 33, y: targetY + 5};
    }
  }

  // Optimize every outgoing side as one group. A greedy flow-by-flow pass can
  // reject two mutually useful moves because the other port still occupies its
  // old position. Considering port permutations and straight candidates
  // together permits those moves while preserving spacing and collision rules.
  const permutations = values => {
    if (values.length < 2) return [values];
    return values.flatMap((value, index) => permutations(values.filter((_, item) => item !== index))
      .map(rest => [value, ...rest]));
  };
  const groupGeometryScore = candidateFlows => {
    let crossings = 0;
    let overlaps = 0;
    for (let left = 0; left < candidateFlows.length; left += 1) {
      for (let right = left + 1; right < candidateFlows.length; right += 1) {
        if (flowsCross(candidateFlows[left], candidateFlows[right])) crossings += 1;
        if (flowsOverlap(candidateFlows[left], candidateFlows[right])) overlaps += 1;
      }
    }
    const bends = candidateFlows.reduce((sum, flow) => sum + Math.max(0, flow.points.length - 2), 0);
    return overlaps * 100000000 + crossings * 1000000 + bends * 10000;
  };
  for (const [sourceId] of options.optimizePorts === false || willOptimizeOrders ? [] : outgoing) {
    if (sourceId.startsWith('trigger:')) continue;
    const source = nodes.get(sourceId);
    const group = flows.filter(flow => flow.from === sourceId);
    if (!group.some(flow => flow.points.length > 2)) continue;
    const originalYs = group.map(flow => flow.points[0].y);
    let best;
    let bestScore = groupGeometryScore(flows);
    for (const assignedSlots of permutations(originalYs)) {
      for (let mask = 1; mask < 2 ** group.length; mask += 1) {
        for (let alignToTarget = 0; alignToTarget < 2 ** group.length; alignToTarget += 1) {
        const ys = group.map((flow, index) => mask & (1 << index)
          ? (alignToTarget & (1 << index) ? flow.points.at(-1).y : originalYs[index])
          : assignedSlots[index]);
        const fixed = group.map((_, index) => Boolean(mask & (1 << index)));
        let spacingValid = true;
        for (let pass = 0; pass < group.length * 2; pass += 1) {
          const ordered = ys.map((y, index) => ({y, index})).sort((a, b) => a.y - b.y || a.index - b.index);
          for (let index = 1; index < ordered.length; index += 1) {
            const lower = ordered[index - 1];
            const upper = ordered[index];
            if (upper.y - lower.y >= MIN_PORT_SPACING) continue;
            if (!fixed[upper.index]) ys[upper.index] = lower.y + MIN_PORT_SPACING;
            else if (!fixed[lower.index]) ys[lower.index] = upper.y - MIN_PORT_SPACING;
            else spacingValid = false;
          }
        }
        const sortedYs = [...ys].sort((a, b) => a - b);
        if (!spacingValid || sortedYs.some((y, index) => index > 0
          && y - sortedYs[index - 1] < MIN_PORT_SPACING - 0.01)) continue;
        const proposedBottom = Math.min(source.y, ...ys.map(y => y - PORT_PADDING));
        const proposedTop = Math.max(source.y + source.height, ...ys.map(y => y + PORT_PADDING));
        if (proposedBottom < graphBottom || proposedTop > graphTop) continue;
        const peers = [...nodes.values()].filter(node => node.id !== source.id && node.x === source.x);
        if (peers.some(peer => !(proposedTop + NODE_GAP <= peer.y
          || proposedBottom >= peer.y + peer.height + NODE_GAP))) continue;
        const proposedBox = {...source, y: proposedBottom, height: proposedTop - proposedBottom};
        const engulfsLine = flows.some(flow => flow.from !== source.id && flow.to !== source.id
          && flow.points.slice(1).some((point, index) =>
            segmentIntersectsBox(flow.points[index], point, proposedBox, 0)));
        if (engulfsLine) continue;
        const replacements = new Map();
        let valid = true;
        group.forEach((flow, index) => {
          if (!valid) return;
          const y = ys[index];
          const start = {x: source.x + source.width, y};
          if (mask & (1 << index)) {
            const target = nodes.get(flow.to);
            const end = {x: target.x, y};
            if ([...nodes.values()].some(node => node.id !== source.id && node.id !== target.id
              && segmentIntersectsBox(start, end, node, MIN_SIDE_CLEARANCE))) {
              valid = false;
              return;
            }
            replacements.set(flow, {...flow, points: [start, end]});
          } else {
            const points = flow.points.map(point => ({...point}));
            points[0].y = y;
            if (points.length > 1) points[1].y = y;
            replacements.set(flow, {...flow, points: simplify(points)});
          }
        });
        if (!valid) continue;
        const directReplacements = group.filter((_, index) => mask & (1 << index))
          .map(flow => replacements.get(flow));
        for (const [flow, replacement] of replacements) {
          if (replacement.points.length < 4) continue;
          const firstVerticalTop = replacement.points[2];
          let escapeX = replacement.points[1].x;
          for (const direct of directReplacements) {
            if (!flowsCross(replacement, direct)) continue;
            const directEndX = direct.points.at(-1).x;
            const targetEscapeX = replacement.points.at(-2).x;
            if (replacement.points.at(-1).x <= directEndX || directEndX + MIN_SIDE_CLEARANCE >= targetEscapeX) {
              valid = false;
              break;
            }
            escapeX = Math.max(escapeX, directEndX + MIN_SIDE_CLEARANCE);
          }
          if (!valid) break;
          replacement.points[1].x = escapeX;
          firstVerticalTop.x = escapeX;
          replacement.points = simplify(replacement.points);
        }
        if (!valid) continue;
        const candidateFlows = flows.map(flow => replacements.get(flow) || flow);
        const targetSides = new Set(group.filter((_, index) => mask & (1 << index)).map(flow => flow.to));
        for (const targetId of targetSides) {
          const ends = candidateFlows.filter(flow => flow.to === targetId)
            .map(flow => flow.points.at(-1).y).sort((a, b) => a - b);
          if (ends.some((y, index) => index > 0 && y - ends[index - 1] < MIN_PORT_SPACING - 0.01)) {
            valid = false;
            break;
          }
        }
        if (!valid) continue;
        const movement = ys.reduce((sum, y, index) => sum + Math.abs(y - originalYs[index]), 0);
        const score = groupGeometryScore(candidateFlows) + movement;
        if (score < bestScore) best = {score, ys, replacements, proposedBottom, proposedTop};
        if (score < bestScore) bestScore = score;
        }
      }
    }
    if (!best) continue;
    source.y = best.proposedBottom;
    source.height = best.proposedTop - best.proposedBottom;
    group.forEach((flow, index) => {
      const replacement = best.replacements.get(flow);
      flow.points = replacement.points;
      flow.symbol = {x: flow.points[0].x + 18, y: best.ys[index]};
      flow.annotation = {x: flow.points[0].x + 33, y: best.ys[index] + 5};
    });
  }

  // Put the final height change immediately after the last blocking element,
  // rather than next to the target. This keeps the target-side approach long
  // and straight even when the complete target axis is obstructed upstream.
  for (const flow of options.optimizePorts === false || willOptimizeOrders
    ? [] : flows.filter(item => item.points.length >= 6)) {
    const end = flow.points.at(-1);
    const verticalTop = flow.points.at(-3);
    const verticalBottom = flow.points.at(-2);
    if (verticalTop.x !== verticalBottom.x || verticalTop.y === end.y) continue;
    const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
    const blockers = [...nodes.values()].filter(node => node.id !== sourceId && node.id !== flow.to
      && end.y >= node.y - MIN_SIDE_CLEARANCE
      && end.y <= node.y + node.height + MIN_SIDE_CLEARANCE
      && node.x + node.width + MIN_SIDE_CLEARANCE > flow.points[1].x
      && node.x - MIN_SIDE_CLEARANCE < verticalTop.x);
    const candidateX = Math.max(flow.points[1].x + MIN_SIDE_CLEARANCE,
      ...blockers.map(node => node.x + node.width + MIN_SIDE_CLEARANCE));
    const before = groupGeometryScore(flows);
    for (let x = candidateX; x < verticalTop.x; x += MIN_CHANNEL_SPACING) {
      const candidate = {...flow, points: flow.points.map(point => ({...point}))};
      candidate.points[candidate.points.length - 3].x = x;
      candidate.points[candidate.points.length - 2].x = x;
      candidate.points = simplify(candidate.points);
      const after = groupGeometryScore(flows.map(item => item === flow ? candidate : item));
      if (after > before) continue;
      flow.points = candidate.points;
      break;
    }
  }


  // Resolve remaining collinear segments by moving internal vertical channels.
  // Overlap is a hard error and therefore dominates added length or bends.
  if (options.optimizePorts !== false && !willOptimizeOrders) {
    const overlapLength = candidateFlows => {
      let total = 0;
      for (let left = 0; left < candidateFlows.length; left += 1) {
        for (let right = left + 1; right < candidateFlows.length; right += 1) {
          for (let a = 1; a < candidateFlows[left].points.length; a += 1) {
            for (let b = 1; b < candidateFlows[right].points.length; b += 1) {
              const firstStart = candidateFlows[left].points[a - 1];
              const firstEnd = candidateFlows[left].points[a];
              const secondStart = candidateFlows[right].points[b - 1];
              const secondEnd = candidateFlows[right].points[b];
              if (firstStart.y === firstEnd.y && secondStart.y === secondEnd.y
                && firstStart.y === secondStart.y) {
                total += Math.max(0, Math.min(Math.max(firstStart.x, firstEnd.x), Math.max(secondStart.x, secondEnd.x))
                  - Math.max(Math.min(firstStart.x, firstEnd.x), Math.min(secondStart.x, secondEnd.x)));
              } else if (firstStart.x === firstEnd.x && secondStart.x === secondEnd.x
                && firstStart.x === secondStart.x) {
                total += Math.max(0, Math.min(Math.max(firstStart.y, firstEnd.y), Math.max(secondStart.y, secondEnd.y))
                  - Math.max(Math.min(firstStart.y, firstEnd.y), Math.min(secondStart.y, secondEnd.y)));
              }
            }
          }
        }
      }
      return total;
    };
    const resolverScore = candidateFlows => groupGeometryScore(candidateFlows)
      + overlapLength(candidateFlows) * 1000000;
    const routeIsClear = (candidate, changedIndex) => {
      const sourceId = 'trigger' in candidate ? `trigger:${candidate.trigger}` : candidate.from;
      const first = Math.max(1, changedIndex - 1);
      const last = Math.min(candidate.points.length - 1, changedIndex + 1);
      for (let segment = first; segment <= last; segment += 1) {
        if ([...nodes.values()].some(node => node.id !== sourceId && node.id !== candidate.to
          && segmentIntersectsBox(candidate.points[segment - 1], candidate.points[segment], node, 10))) return false;
      }
      return true;
    };
    for (let pass = 0; pass < 20; pass += 1) {
      const baseline = resolverScore(flows);
      let best;
      let bestScore = baseline;
      for (const flow of flows) {
        const sourceId = 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
        const source = nodes.get(sourceId);
        const target = nodes.get(flow.to);
        for (let index = 1; index < flow.points.length; index += 1) {
          if (flow.points[index - 1].x !== flow.points[index].x) continue;
          const candidateXs = [
            flow.points[index].x - MIN_CHANNEL_SPACING,
            flow.points[index].x - MIN_LINE_SPACING,
            flow.points[index].x + MIN_LINE_SPACING,
            flow.points[index].x + MIN_CHANNEL_SPACING,
            source.x + source.width + MIN_SIDE_CLEARANCE,
            target.x - MIN_SIDE_CLEARANCE,
          ];
          for (const x of candidateXs) {
            if (x < source.x + source.width + MIN_SIDE_CLEARANCE
              || x > target.x - MIN_SIDE_CLEARANCE) continue;
            const candidate = {...flow, points: flow.points.map(point => ({...point}))};
            candidate.points[index - 1].x = x;
            candidate.points[index].x = x;
            candidate.points = simplify(candidate.points);
            if (!routeIsClear(candidate, index)) continue;
            const score = resolverScore(flows.map(item => item === flow ? candidate : item));
            if (score < bestScore) {
              best = {flow, points: candidate.points};
              bestScore = score;
            }
          }
        }
      }
      if (!best) break;
      best.flow.points = best.points;
    }
  }

  const result = {
    page: {...PAGE, width: pageWidth, height: pageHeight}, nodes: [...nodes.values()], flows, legend: pulse.pulses,
    legendArea: {x: PAGE.margin, y: PAGE.margin, width: pageWidth - PAGE.margin * 2, height: legendHeight, columns: legendColumns},
  };
  if (willOptimizeOrders) {
    const geometryScore = layout => {
      let crossings = 0;
      let overlaps = 0;
      for (let left = 0; left < layout.flows.length; left += 1) {
        for (let right = left + 1; right < layout.flows.length; right += 1) {
          if (flowsCross(layout.flows[left], layout.flows[right])) crossings += 1;
          if (flowsOverlap(layout.flows[left], layout.flows[right])) overlaps += 1;
        }
      }
      const bends = layout.flows.reduce((sum, flow) => sum + Math.max(0, flow.points.length - 2), 0);
      const length = layout.flows.reduce((sum, flow) => sum + flow.points.slice(1)
        .reduce((flowSum, point, index) => flowSum
          + Math.abs(point.x - flow.points[index].x) + Math.abs(point.y - flow.points[index].y), 0), 0);
      return overlaps * 100000000 + crossings * 1000000 + bends * 10000 + length / 100;
    };
    let orders = levels.map(items => items.map(item => item.id));
    let best = result;
    let bestScore = geometryScore(result);
    const renderOrder = (candidateOrders, outgoingOrders = {}) => layoutPulse(pulse, {
      triggerOrder: candidateOrders[0],
      levelOrders: Object.fromEntries(candidateOrders.slice(1).map((ids, index) => [index + 1, ids])),
      outgoingOrders,
      optimizeTriggers: false,
      optimizePorts: false,
    });
    for (let pass = 0; pass < 8; pass += 1) {
      let passBest = best;
      let passBestScore = bestScore;
      let passBestOrders = orders;
      const candidates = [];
      for (let level = 0; level < orders.length; level += 1) {
        for (let left = 0; left < orders[level].length; left += 1) {
          for (let right = left + 1; right < orders[level].length; right += 1) {
            const candidateOrders = orders.map(ids => [...ids]);
            [candidateOrders[level][left], candidateOrders[level][right]]
              = [candidateOrders[level][right], candidateOrders[level][left]];
            candidates.push(candidateOrders);
          }
        }
      }
      const triggerTargets = pulse.flows.filter(flow => 'trigger' in flow)
        .map(flow => ({trigger: `trigger:${flow.trigger}`, target: flow.to, level: depths.get(flow.to)}));
      for (let left = 0; left < triggerTargets.length; left += 1) {
        for (let right = left + 1; right < triggerTargets.length; right += 1) {
          const a = triggerTargets[left];
          const b = triggerTargets[right];
          if (a.level !== b.level) continue;
          const candidateOrders = orders.map(ids => [...ids]);
          const triggerLeft = candidateOrders[0].indexOf(a.trigger);
          const triggerRight = candidateOrders[0].indexOf(b.trigger);
          const behaviorLeft = candidateOrders[a.level].indexOf(a.target);
          const behaviorRight = candidateOrders[a.level].indexOf(b.target);
          if (triggerLeft < 0 || triggerRight < 0 || behaviorLeft < 0 || behaviorRight < 0) continue;
          [candidateOrders[0][triggerLeft], candidateOrders[0][triggerRight]]
            = [candidateOrders[0][triggerRight], candidateOrders[0][triggerLeft]];
          [candidateOrders[a.level][behaviorLeft], candidateOrders[a.level][behaviorRight]]
            = [candidateOrders[a.level][behaviorRight], candidateOrders[a.level][behaviorLeft]];
          candidates.push(candidateOrders);
        }
      }
      for (const candidateOrders of candidates) {
        const candidate = renderOrder(candidateOrders);
        const score = geometryScore(candidate);
        if (score < passBestScore) {
          passBest = candidate;
          passBestScore = score;
          passBestOrders = candidateOrders;
        }
      }
      if (passBestScore >= bestScore) break;
      best = passBest;
      bestScore = passBestScore;
      orders = passBestOrders;
    }
    let outgoingOrders = {};
    for (let pass = 0; pass < 6; pass += 1) {
      let passBest = best;
      let passBestScore = bestScore;
      let passBestOutgoing = outgoingOrders;
      const sourceIds = [...new Set(best.flows.map(flow => 'trigger' in flow
        ? `trigger:${flow.trigger}` : flow.from))];
      for (const sourceId of sourceIds) {
        const sourceFlows = best.flows.filter(flow => ('trigger' in flow
          ? `trigger:${flow.trigger}` : flow.from) === sourceId)
          .sort((a, b) => a.points[0].y - b.points[0].y);
        if (sourceFlows.length < 2) continue;
        const baseKeys = sourceFlows.map(semanticFlowKey);
        for (let left = 0; left < baseKeys.length; left += 1) {
          for (let right = left + 1; right < baseKeys.length; right += 1) {
            const keys = [...baseKeys];
            [keys[left], keys[right]] = [keys[right], keys[left]];
            const candidateOutgoing = {...outgoingOrders, [sourceId]: keys};
            const candidate = renderOrder(orders, candidateOutgoing);
            const score = geometryScore(candidate);
            if (score < passBestScore) {
              passBest = candidate;
              passBestScore = score;
              passBestOutgoing = candidateOutgoing;
            }
          }
        }
      }
      if (passBestScore >= bestScore) break;
      best = passBest;
      bestScore = passBestScore;
      outgoingOrders = passBestOutgoing;
    }
    const renderFinal = candidateOrders => layoutPulse(pulse, {
      triggerOrder: candidateOrders[0],
      levelOrders: Object.fromEntries(candidateOrders.slice(1).map((ids, index) => [index + 1, ids])),
      outgoingOrders,
      optimizeTriggers: false,
    });
    let finalOrders = orders.map(ids => [...ids]);
    let finalLayout = renderFinal(finalOrders);
    let finalScore = geometryScore(finalLayout);
    // The coarse order search intentionally runs without the expensive final
    // port optimizer. Reconsider trigger positions afterwards against the
    // actual finished geometry, where long trigger routes and target ports are
    // known. This is generic and may move any trigger to any position.
    for (let pass = 0; pass < 4; pass += 1) {
      let passLayout = finalLayout;
      let passOrders = finalOrders;
      let passScore = finalScore;
      const crossingSources = new Set();
      for (let left = 0; left < finalLayout.flows.length; left += 1) {
        for (let right = left + 1; right < finalLayout.flows.length; right += 1) {
          if (!flowsCross(finalLayout.flows[left], finalLayout.flows[right])) continue;
          if ('trigger' in finalLayout.flows[left]) crossingSources.add(`trigger:${finalLayout.flows[left].trigger}`);
          if ('trigger' in finalLayout.flows[right]) crossingSources.add(`trigger:${finalLayout.flows[right].trigger}`);
        }
      }
      const movable = crossingSources.size
        ? [...crossingSources].map(id => finalOrders[0].indexOf(id)).filter(index => index >= 0)
        : finalOrders[0].map((_, index) => index);
      for (const from of movable) {
        for (let to = 0; to < finalOrders[0].length; to += 1) {
          if (from === to) continue;
          const candidateOrders = finalOrders.map(ids => [...ids]);
          const [trigger] = candidateOrders[0].splice(from, 1);
          candidateOrders[0].splice(to, 0, trigger);
          const candidate = renderFinal(candidateOrders);
          const score = geometryScore(candidate);
          if (score < passScore) {
            passLayout = candidate;
            passOrders = candidateOrders;
            passScore = score;
          }
        }
      }
      if (passScore >= finalScore) break;
      finalLayout = passLayout;
      finalOrders = passOrders;
      finalScore = passScore;
    }
    return finalLayout;
  }
  return result;
}
