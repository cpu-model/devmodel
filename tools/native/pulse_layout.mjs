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
  const behaviorSources = new Set(pulse.flows.filter(flow => 'from' in flow).map(flow => flow.to));
  for (const behavior of pulse.behaviors) if (!behaviorSources.has(behavior.id)) depth.set(behavior.id, 1);
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

const intervalsOverlap = (a1, a2, b1, b2) => Math.min(Math.max(a1, a2), Math.max(b1, b2))
  - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 0.01;

function layoutCapabilityOverview(pulse) {
  const sourceId = flow => 'trigger' in flow ? `trigger:${flow.trigger}` : flow.from;
  const relationKey = flow => `${sourceId(flow)}\u0000${flow.pulse}\u0000${flow.to}`;
  const keys = pulse.flows.map(relationKey);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate capability overview relations reached layout');
  if (process.env.CPU_TRACE_OVERVIEW_RELATIONS === '1') {
    console.error('[pulse-overview-relations]');
    for (const flow of pulse.flows) console.error(JSON.stringify({source: sourceId(flow), pulse: flow.pulse, target: flow.to}));
  }

  const eventById = new Map(pulse.pulses.map(item => [item.id, item]));
  const capabilities = [...pulse.behaviors];
  const capIds = new Set(capabilities.map(item => item.id));
  const depth = new Map(capabilities.map(item => [item.id, 0]));
  for (let pass = 0; pass < capabilities.length; pass += 1) {
    let changed = false;
    for (const flow of pulse.flows) {
      if (!('from' in flow) || !capIds.has(flow.from) || !capIds.has(flow.to)) continue;
      const candidate = (depth.get(flow.from) || 0) + 1;
      if (candidate > depth.get(flow.to) && candidate <= capabilities.length) {
        depth.set(flow.to, candidate); changed = true;
      }
    }
    if (!changed) break;
  }
  const maxDepth = Math.max(0, ...depth.values());
  const levels = Array.from({length: maxDepth + 1}, (_, d) =>
    capabilities.filter(item => depth.get(item.id) === d).sort((a,b) => a.name.localeCompare(b.name)));

  const orderedFlows = [...pulse.flows].sort((a,b) =>
    (depth.get(a.to)||0) - (depth.get(b.to)||0)
    || sourceId(a).localeCompare(sourceId(b)) || a.to.localeCompare(b.to) || a.pulse.localeCompare(b.pulse));
  const lane = new Map(orderedFlows.map((flow,index) => [relationKey(flow), index]));
  const laneCount = Math.max(1, orderedFlows.length);
  const nodeWidth = 190;
  const portSpacing = MIN_CHANNEL_SPACING;
  const rowGap = 96;
  const corridorWidth = MIN_SIDE_CLEARANCE * 2 + laneCount * MIN_CHANNEL_SPACING;
  const triggerGap = corridorWidth;
  const heightById = new Map(capabilities.map(cap => {
    const ports = Math.max(
      pulse.flows.filter(f => 'from' in f && f.from === cap.id).length,
      pulse.flows.filter(f => f.to === cap.id).length, 1);
    return [cap.id, Math.max(72, (ports + 1) * portSpacing)];
  }));
  const levelHeight = Math.max(...capabilities.map(cap => heightById.get(cap.id)), 72);
  const top = PAGE.margin + 120;
  const capabilityNodes = [];
  for (let d=0; d<levels.length; d+=1) {
    let y=top;
    for (const cap of levels[d]) {
      capabilityNodes.push({...cap, kind:'capability',
        x: PAGE.margin + TRIGGER.width + triggerGap + d * (nodeWidth + corridorWidth),
        y, width:nodeWidth, height:heightById.get(cap.id)});
      y += heightById.get(cap.id) + rowGap;
    }
  }
  const nodeById = new Map(capabilityNodes.map(n=>[n.id,n]));
  const triggers = [...new Set(pulse.flows.filter(f=>'trigger' in f).map(f=>f.trigger))].sort();
  const triggerNodes = triggers.map((id,index) => ({
    id:`trigger:${id}`,
    name:pulse.flows.find(f=>f.trigger===id)?.triggerLabel || id,
    kind:'trigger', x:PAGE.margin, y:top + index*(TRIGGER.height+rowGap),
    width:TRIGGER.width, height:TRIGGER.height,
  }));
  for (const n of triggerNodes) nodeById.set(n.id,n);
  const nodes=[...capabilityNodes,...triggerNodes];

  const outgoing = new Map(), incoming = new Map();
  for (const flow of orderedFlows) {
    const s=sourceId(flow);
    if(!outgoing.has(s)) outgoing.set(s,[]);
    if(!incoming.has(flow.to)) incoming.set(flow.to,[]);
    outgoing.get(s).push(flow); incoming.get(flow.to).push(flow);
  }
  for (const a of outgoing.values()) a.sort((x,y)=>lane.get(relationKey(x))-lane.get(relationKey(y)));
  for (const a of incoming.values()) a.sort((x,y)=>lane.get(relationKey(x))-lane.get(relationKey(y)));

  const flows=orderedFlows.map(flow=>{
    const source=nodeById.get(sourceId(flow)), target=nodeById.get(flow.to);
    if(!source||!target) throw new Error(`Missing overview node for ${relationKey(flow)}`);
    const outs=outgoing.get(sourceId(flow));
    const ins=incoming.get(flow.to);
    const sy=source.y + source.height*(outs.indexOf(flow)+1)/(outs.length+1);
    const ty=target.y + target.height*(ins.indexOf(flow)+1)/(ins.length+1);
    const sourceDepth='trigger' in flow ? -1 : (depth.get(flow.from)||0);
    const targetDepth=depth.get(flow.to)||0;
    const laneOffset=(lane.get(relationKey(flow))+1)*MIN_CHANNEL_SPACING;
    // The lane is deterministic inside the first corridor crossed by the
    // relation. Long relations remain in the open corridor band above nodes,
    // then approach the target through the target's own left corridor.
    const firstCorridorLeft = sourceDepth < 0
      ? PAGE.margin + TRIGGER.width
      : source.x + source.width;
    const x1=firstCorridorLeft + MIN_SIDE_CLEARANCE + laneOffset;
    const targetCorridorLeft=target.x-corridorWidth;
    const x2=targetCorridorLeft + MIN_SIDE_CLEARANCE + laneOffset;
    const trackY=top - MIN_SIDE_CLEARANCE - laneOffset;
    const start={x:source.x+source.width,y:sy}, end={x:target.x,y:ty};
    const points=[start,{x:x1,y:sy},{x:x1,y:trackY},{x:x2,y:trackY},{x:x2,y:ty},end];
    return {...flow,event:eventById.get(flow.pulse),points,
      symbol:{x:start.x+PULSE_RADIUS+4,y:start.y},
      symbolGroup:`${sourceId(flow)}\u0000${flow.pulse}`,
      annotation:{x:start.x+PULSE_RADIUS*2+10,y:start.y+5}};
  });

  const minY=Math.min(...flows.flatMap(f=>f.points.map(p=>p.y)),top);
  if(minY<PAGE.margin) {
    const shift=PAGE.margin-minY;
    for(const node of nodes) node.y+=shift;
    for(const flow of flows){for(const p of flow.points)p.y+=shift; flow.symbol.y+=shift; flow.annotation.y+=shift;}
  }
  const bottom=Math.max(...nodes.map(n=>n.y+n.height),...flows.flatMap(f=>f.points.map(p=>p.y)));
  const right=Math.max(...nodes.map(n=>n.x+n.width),...flows.flatMap(f=>f.points.map(p=>p.x)));
  const legendColumns=3, legendHeight=Math.ceil(pulse.pulses.length/legendColumns)*LEGEND_ROW+42;
  return {page:{...PAGE,width:right+PAGE.margin,height:bottom+72+legendHeight+PAGE.margin},
    nodes,flows,legend:pulse.pulses,
    legendArea:{x:PAGE.margin,y:bottom+72,width:right-PAGE.margin,height:legendHeight,columns:legendColumns}};
}

function layoutCausal(pulse, options = {}) {
  const trace = options.tracePhases === true;
  const traceLabel = options.traceLabel || 'pulse';
  const tracePhase = phase => { if (trace) console.error(`[pulse-layout] ${traceLabel}: ${phase}`); };
  tracePhase(`start behaviors=${pulse.behaviors.length} flows=${pulse.flows.length}`);
  const nodeGap = options.nodeGap ?? NODE_GAP;
  const eventById = new Map(pulse.pulses.map(item => [item.id, item]));
  // Layout ordering needs occurrence identity, not only semantic equality:
  // distinct Flow occurrences may project to the same source, Pulse and target.
  const flowOccurrence = new Map(pulse.flows.map((flow, index) => [flow, index]));
  const semanticFlowKey = flow => `${'trigger' in flow ? `trigger:${flow.trigger}` : `from:${flow.from}`}\u0000${flow.pulse}\u0000${flow.to}\u0000${flowOccurrence.get(flow)}`;
  const triggers = [...new Set(pulse.flows.filter(flow => 'trigger' in flow).map(flow => flow.trigger))];
  const depths = behaviorDepths(pulse);
  const maxDepth = Math.max(1, ...depths.values());
  const behaviorLevels = Array.from({length: maxDepth}, (_, i) => pulse.behaviors.filter(item => depths.get(item.id) === i + 1));
  const triggerLabel = name => pulse.flows.find(flow => 'trigger' in flow && flow.trigger === name)?.triggerLabel || name;
  const levels = [triggers.map(name => ({id: `trigger:${name}`, name: triggerLabel(name)})), ...behaviorLevels.map(items => [...items])];
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
  const behaviorById = new Map(pulse.behaviors.map(item => [item.id, item]));
  const intrinsicBehaviorHeight = id => {
    const behavior = behaviorById.get(id);
    const inputs = behavior?.informationIn?.length || 0;
    const outputs = behavior?.informationOut?.length || 0;
    const informationHeight = (inputs + outputs) * 16 + (inputs ? 10 : 0) + (outputs ? 10 : 0);
    return BEHAVIOR.height + informationHeight;
  };
  const portCountFor = id => Math.max(incoming.get(id)?.length || 0, outgoing.get(id)?.length || 0);
  const portHeight = id => PORT_PADDING * 2 + Math.max(0, portCountFor(id) - 1) * MIN_PORT_SPACING;
  const nodeHeight = id => Math.max(intrinsicBehaviorHeight(id), portHeight(id));
  const triggerHeight = id => Math.max(TRIGGER.height, portHeight(id));
  const levelHeights = levels.map((items, level) => items.reduce((sum, item) => {
    const id = item.id;
    return sum + (level === 0 ? triggerHeight(id) : nodeHeight(id));
  }, 0) + Math.max(0, items.length - 1) * nodeGap);
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
  const overviewTopRoutingMargin = options.projectionKind === 'overview'
    ? Math.max(MIN_CHANNEL_SPACING * 2, pulse.flows.length * MIN_CHANNEL_SPACING)
    : 0;
  const pageHeight = Math.max(595, PAGE.margin + 44 + overviewTopRoutingMargin + graphHeight + 54 + legendHeight + PAGE.margin);
  const graphTop = pageHeight - 78 - overviewTopRoutingMargin;
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
      const height = level === 0 ? triggerHeight(id) : nodeHeight(id);
      nodes.set(id, {
        ...item, id, kind: level === 0 ? 'trigger' : 'behavior',
        x, y: top - height, width, height,
      });
      top -= height + nodeGap;
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
      floor = node.y + node.height + nodeGap;
    }
    let ceiling = graphTop;
    for (const node of [...levelNodes].reverse()) {
      if (node.y + node.height > ceiling) node.y = ceiling - node.height;
      ceiling = node.y - nodeGap;
    }
    floor = graphBottom;
    for (const node of levelNodes) {
      if (node.y < floor) node.y = floor;
      floor = node.y + node.height + nodeGap;
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
    const clear = peers.every(peer => desiredY + node.height + nodeGap <= peer.y
      || desiredY >= peer.y + peer.height + nodeGap);
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
      .map(peer => peer.y + peer.height + nodeGap));
    const upperBound = Math.min(graphTop, ...peers
      .filter(peer => centerY(peer) > centerY(node))
      .map(peer => peer.y - nodeGap));
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
        && !(positions.get(node.id) + node.height + nodeGap <= peer.y
          || positions.get(node.id) >= peer.y + peer.height + nodeGap))) {
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
    const sourceCandidates = item.source.kind === 'trigger' ? [item.start.y] : [item.start.y, item.end.y, preferred];
    if (item.source.kind !== 'trigger') {
      for (let offset = 6; offset <= high - low; offset += 6) sourceCandidates.push(preferred - offset, preferred + offset);
    }
    const y = sourceCandidates.find(value => value >= low && value <= high
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

  const overviewLineSpacing = options.projectionKind === 'overview' ? MIN_CHANNEL_SPACING : MIN_LINE_SPACING;
  const routeTracks = new Map();
  const targetApproaches = new Map();
  for (const item of routed.filter(item => !item.direct && item.minimalBendX === undefined)) {
    if (!targetApproaches.has(item.end.x)) targetApproaches.set(item.end.x, []);
    targetApproaches.get(item.end.x).push(item);
  }
  for (const group of targetApproaches.values()) {
    group.sort((a, b) => a.end.y - b.end.y || a.flow.pulse.localeCompare(b.flow.pulse));
    group.forEach((item, index) => {
      let x = item.end.x - MIN_SIDE_CLEARANCE - index * MIN_CHANNEL_SPACING;
      if (options.projectionKind === 'overview') {
        while (verticalReservations.some(other => Math.abs(other.x - x) < MIN_CHANNEL_SPACING
          && intervalsOverlap(other.y1, other.y2, item.start.y, item.end.y))) {
          x -= MIN_CHANNEL_SPACING;
        }
      }
      item.targetEscapeX = x;
    });
  }
  const sourceEscapeDiagnostics = [];
  for (const item of routed.filter(item => !item.direct && item.minimalBendX === undefined)) {
    const minimumX = item.start.x + MIN_SIDE_CLEARANCE;
    const maximumX = item.end.x - MIN_SIDE_CLEARANCE;
    const preferredX = Math.max(minimumX, Math.min(maximumX, item.midX));
    const candidates = [preferredX];
    for (let offset = MIN_CHANNEL_SPACING; offset <= maximumX - minimumX; offset += MIN_CHANNEL_SPACING) {
      candidates.push(preferredX + offset, preferredX - offset);
    }
    const evaluatedCandidates = candidates.filter(x => x >= minimumX && x <= maximumX).map(x => ({
      x,
      blockers: [...nodes.values()].filter(node => node.id !== item.sourceId && node.id !== item.flow.to
        && (segmentIntersectsBox(item.start, {x, y: item.start.y}, node)
          || segmentIntersectsBox({x, y: item.start.y}, {x, y: item.end.y}, node)))
        .map(node => node.id),
    }));
    item.sourceEscapeX = evaluatedCandidates.find(candidate => candidate.blockers.length === 0
      && (options.projectionKind !== 'overview' || verticalReservations.every(other =>
        Math.abs(other.x - candidate.x) >= MIN_CHANNEL_SPACING
        || !intervalsOverlap(other.y1, other.y2, item.start.y, item.end.y))))?.x;
    if (item.sourceEscapeX === undefined) {
      // A projected external trigger may span every straight source-escape
      // candidate. Defer the vertical detour to track routing; only the short
      // horizontal source leg must be clear here.
      const horizontalCandidate = evaluatedCandidates.find(candidate => {
        const x = candidate.x;
        return ![...nodes.values()].some(node => node.id !== item.sourceId && node.id !== item.flow.to
          && segmentIntersectsBox(item.start, {x, y: item.start.y}, node));
      });
      if (horizontalCandidate) {
        item.sourceEscapeX = horizontalCandidate.x;
        item.sourceEscapeNeedsDetour = true;
      }
    }
    if (item.sourceEscapeX === undefined) {
      const leftEdge = Math.min(...[...nodes.values()].map(node => node.x));
      const outsideX = leftEdge - MIN_SIDE_CLEARANCE;
      const clear = [...nodes.values()].every(node =>
        node.id === item.sourceId || node.id === item.flow.to
        || !segmentIntersectsBox(item.start, {x: outsideX, y: item.start.y}, node));
      if (clear) item.sourceEscapeX = outsideX;
    }
    if (item.sourceEscapeX === undefined && item.source.kind === 'trigger') {
      const otherNodes = [...nodes.values()].filter(node => node.id !== item.sourceId && node.id !== item.flow.to);
      const leftX = Math.min(...[...nodes.values()].map(node => node.x)) - MIN_SIDE_CLEARANCE;
      const ys = [];
      for (let step = 1; step <= 40; step += 1) {
        ys.push(item.start.y - step * MIN_LINE_SPACING, item.start.y + step * MIN_LINE_SPACING);
      }
      const detourY = ys.find(y => {
        const segments = [
          [item.start, {x: item.start.x, y}],
          [{x: item.start.x, y}, {x: leftX, y}],
        ];
        return otherNodes.every(node => segments.every(([a, b]) => !segmentIntersectsBox(a, b, node)));
      });
      if (detourY !== undefined) {
        item.sourceEscapeX = leftX;
        item.sourceDetourY = detourY;
      } else if (options.debugRouting) {
        console.error('[pulse-layout] detour-failed', JSON.stringify({
          pulse: item.flow.pulse,
          sourceId: item.sourceId,
          targetId: item.flow.to,
          source: item.source,
          start: item.start,
          leftX,
          blockers: otherNodes.map(node => ({
            id: node.id, x: node.x, y: node.y, width: node.width, height: node.height,
          })),
        }));
      }
    }
    if (options.debugRouting) sourceEscapeDiagnostics.push({
      pulse: item.flow.pulse, sourceId: item.sourceId, targetId: item.flow.to,
      start: {...item.start}, end: {...item.end}, midX: item.midX,
      candidates: evaluatedCandidates, selectedX: item.sourceEscapeX ?? null,
    });
  }
  const unroutable = routed.filter(item => !item.direct && item.minimalBendX === undefined
    && item.sourceEscapeX === undefined);
  if (unroutable.length) {
    const detail = options.debugRouting ? unroutable.map(item => {
      const diagnostic = sourceEscapeDiagnostics.find(entry => entry.pulse === item.flow.pulse
        && entry.sourceId === item.sourceId && entry.targetId === item.flow.to);
      return `${item.sourceId} --${item.flow.pulse}--> ${item.flow.to} candidates=${JSON.stringify(diagnostic?.candidates || [])}`;
    }).join('\n') : unroutable.map(item => item.flow.pulse).join(', ');
    throw new Error(`No clear source escape channel for Pulse Flow: ${detail}`);
  }
  const reservations = [...minimalReservations, ...routed.filter(item => !item.direct && item.minimalBendX === undefined).flatMap(item => [
    {x1: item.start.x, x2: item.sourceEscapeX, y: item.sourceDetourY ?? item.start.y},
    {x1: item.targetEscapeX, x2: item.end.x, y: item.end.y},
  ])];
  if (options.projectionKind === 'overview') {
    // Overview routes are allocated atomically: later relations must choose
    // their escape channels against the completed vertical reservations of
    // earlier relations, not against a stale pre-routing snapshot.
    const pending = routed.filter(item => !item.direct && item.minimalBendX === undefined);
    const usedOverviewXs = verticalReservations.map(item => item.x);
    for (const item of pending) {
      const minimumX = item.start.x + MIN_SIDE_CLEARANCE;
      const maximumX = item.end.x - MIN_SIDE_CLEARANCE;
      const sourceCandidates = [];
      for (let x = Math.max(minimumX, Math.min(maximumX, item.midX)); x <= maximumX; x += MIN_CHANNEL_SPACING) sourceCandidates.push(x);
      for (let x = Math.max(minimumX, Math.min(maximumX, item.midX)) - MIN_CHANNEL_SPACING; x >= minimumX; x -= MIN_CHANNEL_SPACING) sourceCandidates.push(x);
      const clearVertical = x => usedOverviewXs.every(otherX =>
        Math.abs(otherX - x) >= MIN_CHANNEL_SPACING);
      const sourceX = sourceCandidates.find(x => clearVertical(x)
        && [...nodes.values()].every(node => node.id === item.sourceId || node.id === item.flow.to
          || !segmentIntersectsBox(item.start, {x, y: item.start.y}, node)));
      if (sourceX !== undefined) item.sourceEscapeX = sourceX;
      let targetX = item.end.x - MIN_SIDE_CLEARANCE;
      while (targetX > minimumX && !clearVertical(targetX)) targetX -= MIN_CHANNEL_SPACING;
      item.targetEscapeX = targetX;
      usedOverviewXs.push(item.sourceEscapeX, item.targetEscapeX);
      // Reserve provisional full-height escapes now; track routing below may
      // shorten them, but later routes must never select the same channel.
      verticalReservations.push(
        {x: item.sourceEscapeX, y1: item.start.y, y2: item.end.y, owner: item.flow},
        {x: item.targetEscapeX, y1: item.start.y, y2: item.end.y, owner: item.flow},
      );
    }
  }
  const requests = routed.filter(item => !item.direct && item.minimalBendX === undefined).map(item => ({
    item,
    baseY: ((item.sourceDetourY ?? item.start.y) + item.end.y) / 2,
    x1: item.sourceEscapeX,
    x2: item.targetEscapeX,
  })).sort((a, b) => a.baseY - b.baseY || a.item.flow.pulse.localeCompare(b.item.flow.pulse));
  for (const request of requests) {
    let best = null;
    for (let step = 0; step < 240; step += 1) {
      const trackY = request.baseY + (step === 0 ? 0
        : (step % 2 ? 1 : -1) * Math.ceil(step / 2) * MIN_LINE_SPACING);
      const routeSegments = [
        [{x: request.item.start.x, y: request.item.start.y}, {x: request.item.start.x, y: request.item.sourceDetourY ?? request.item.start.y}],
        [{x: request.item.start.x, y: request.item.sourceDetourY ?? request.item.start.y}, {x: request.x1, y: request.item.sourceDetourY ?? request.item.start.y}],
        [{x: request.x1, y: request.item.sourceDetourY ?? request.item.start.y}, {x: request.x1, y: trackY}],
        [{x: request.x1, y: trackY}, {x: request.x2, y: trackY}],
        [{x: request.x2, y: trackY}, {x: request.x2, y: request.item.end.y}],
        [{x: request.x2, y: request.item.end.y}, {x: request.item.end.x, y: request.item.end.y}],
      ];
      if ([...nodes.values()].some(node => node.id !== request.item.sourceId && node.id !== request.item.flow.to
        && routeSegments.some(([start, end]) => segmentIntersectsBox(start, end, node)))) continue;
      const parallelConflicts = reservations.filter(other => intervalsOverlap(request.x1, request.x2, other.x1, other.x2)
        && Math.abs(trackY - other.y) < overviewLineSpacing).length;
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
      const overviewVerticalConflicts = options.projectionKind === 'overview'
        ? verticalReservations.filter(other => other.owner !== request.item.flow
          && ((Math.abs(other.x - request.x1) < MIN_CHANNEL_SPACING
            && intervalsOverlap(other.y1, other.y2, request.item.start.y, trackY))
          || (Math.abs(other.x - request.x2) < MIN_CHANNEL_SPACING
            && intervalsOverlap(other.y1, other.y2, trackY, request.item.end.y)))).length
        : 0;
      if (overviewVerticalConflicts > 0) continue;
      const score = endpointCrossings * 1000000
        + trackCrossings * 10000 + parallelConflicts * 100 + Math.abs(trackY - request.baseY);
      if (best === null || score < best.score) best = {score, y: trackY};
      if (score === 0) break;
    }
    if (best === null) {
      const blockingVerticals = options.projectionKind === 'overview'
        ? verticalReservations.filter(other =>
          Math.abs(other.x - request.x1) < MIN_CHANNEL_SPACING
          || Math.abs(other.x - request.x2) < MIN_CHANNEL_SPACING)
        : [];
      throw new Error(`No clear track for Pulse Flow: ${request.item.flow.pulse}; `
        + `source=${request.item.sourceId} target=${request.item.flow.to} `
        + `x1=${request.x1} x2=${request.x2} startY=${request.item.start.y} endY=${request.item.end.y} `
        + `verticals=${JSON.stringify(blockingVerticals)}`);
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
    const sourceDetourY = routed.find(item => item.flow === flow)?.sourceDetourY;
    const points = sourceDetourY === undefined ? [
      start,
      {x: sourceEscapeX, y: start.y},
      {x: sourceEscapeX, y: trackY},
      {x: targetEscapeX, y: trackY},
      {x: targetEscapeX, y: end.y},
      end,
    ] : [
      start,
      {x: start.x, y: sourceDetourY},
      {x: sourceEscapeX, y: sourceDetourY},
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
  const orderSearchPairs = levels.reduce((sum, items) => sum + items.length * Math.max(0, items.length - 1) / 2, 0);
  // Each order candidate recursively performs a complete layout and its geometry
  // score compares flow pairs. Bound the estimated work, not merely node pairs:
  // small projections with dense fan-in/fan-out can otherwise be much more
  // expensive than larger sparse projections.
  const orderSearchWork = orderSearchPairs * Math.max(1, pulse.flows.length ** 2);
  const willOptimizeOrders = options.optimizeTriggers !== false && !options.triggerOrder
    && levels[0].length > 2 && orderSearchPairs <= 120 && orderSearchWork <= 12000;
  // Global port and overlap refinements repeatedly score flow pairs. On dense
  // projections the deterministic base routes are preferable to unbounded
  // presentation-only refinement.
  const refinementWork = pulse.flows.length ** 2 * Math.max(1, nodes.size);
  const willRefineDenseGeometry = options.optimizePorts !== false && refinementWork <= 8000;

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
      if (peers.some(peer => !(proposedTop + nodeGap <= peer.y
        || proposedBottom >= peer.y + peer.height + nodeGap))) continue;
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

  tracePhase('port-optimization-start');
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
  for (const [sourceId] of !willRefineDenseGeometry || willOptimizeOrders ? [] : outgoing) {
    if (sourceId.startsWith('trigger:')) continue;
    const source = nodes.get(sourceId);
    const group = flows.filter(flow => flow.from === sourceId);
    if (!group.some(flow => flow.points.length > 2)) continue;
    const originalYs = group.map(flow => flow.points[0].y);
    // Exhaustive group optimization is factorial/exponential. Large fan-outs
    // keep the deterministic routed geometry rather than making rendering unbounded.
    if (group.length > 5) continue;
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
        if (peers.some(peer => !(proposedTop + nodeGap <= peer.y
          || proposedBottom >= peer.y + peer.height + nodeGap))) continue;
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
          const sourceId = 'trigger' in replacement ? `trigger:${replacement.trigger}` : replacement.from;
          if (replacement.points.slice(1).some((point, pointIndex) =>
            [...nodes.values()].some(node => node.id !== sourceId && node.id !== replacement.to
              && segmentIntersectsBox(replacement.points[pointIndex], point, node, 10)))) {
            valid = false;
            break;
          }
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

  tracePhase('port-optimization-complete');
  tracePhase('approach-optimization-start');
  // Put the final height change immediately after the last blocking element,
  // rather than next to the target. This keeps the target-side approach long
  // and straight even when the complete target axis is obstructed upstream.
  for (const flow of !willRefineDenseGeometry || willOptimizeOrders
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
      const routeIsClear = candidate.points.slice(1).every((point, index) =>
        [...nodes.values()].every(node => node.id === sourceId || node.id === flow.to
          || !segmentIntersectsBox(candidate.points[index], point, node, MIN_SIDE_CLEARANCE)));
      if (!routeIsClear) continue;
      const after = groupGeometryScore(flows.map(item => item === flow ? candidate : item));
      if (after > before) continue;
      flow.points = candidate.points;
      break;
    }
  }

  tracePhase('approach-optimization-complete');

  tracePhase('overlap-resolver-start');

  // Resolve remaining collinear segments by moving internal vertical channels.
  // Overlap is a hard error and therefore dominates added length or bends.
  if (willRefineDenseGeometry && !willOptimizeOrders) {
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

  tracePhase('overlap-resolver-complete');
  tracePhase('base-routing-complete');
  const result = {
    page: {...PAGE, width: pageWidth, height: pageHeight}, nodes: [...nodes.values()], flows, legend: pulse.pulses,
    legendArea: {x: PAGE.margin, y: PAGE.margin, width: pageWidth - PAGE.margin * 2, height: legendHeight, columns: legendColumns},
  };
  if (willOptimizeOrders) {
    tracePhase('order-optimization-start');
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
    const renderOrder = (candidateOrders, outgoingOrders = {}) => layoutCausal(pulse, {
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
    const renderFinal = candidateOrders => layoutCausal(pulse, {
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
    tracePhase('order-optimization-complete');
    if (options.debugRouting) finalLayout.debug = {sourceEscapes: sourceEscapeDiagnostics};
    tracePhase('complete');
    return finalLayout;
  }
  if (options.debugRouting) result.debug = {sourceEscapes: sourceEscapeDiagnostics};
  tracePhase('complete');
  return result;
}

function usedLegend(allPulses, flows) {
  const used = new Set(flows.map(flow => flow.pulse));
  return allPulses.filter(pulse => used.has(pulse.id));
}

function causalPage(pulse, projection, title, kind, options = {}) {
  const informationById = new Map((pulse['domain-information'] || []).map(item => [item.id, item]));
  const behaviors = projection.behaviors.map(behavior => ({
    ...behavior,
    informationIn: (behavior['information-in'] || []).map(id => informationById.get(id)).filter(Boolean),
    informationOut: (behavior['information-out'] || []).map(id => informationById.get(id)).filter(Boolean),
  }));
  const pagePulse = {behaviors, pulses: pulse.pulses, flows: projection.flows};
  if (options.tracePhases === true) console.error(`[pulse-layout] page-start: ${title}`);
  const layout = kind === 'overview'\n    ? layoutCapabilityOverview(pagePulse)\n    : layoutCausal(pagePulse, {...options, traceLabel: title, projectionKind: kind});
  if (options.tracePhases === true) console.error(`[pulse-layout] page-complete: ${title}`);
  layout.title = title;
  layout.kind = kind;
  layout.legend = usedLegend(pulse.pulses, projection.flows);
  const boundaryIds = new Set(projection.boundaryIds || []);
  const capabilityIds = new Set(projection.capabilityIds || []);
  for (const node of layout.nodes) {
    if (boundaryIds.has(node.id)) node.kind = 'boundary';
    if (capabilityIds.has(node.id)) node.kind = 'capability';
  }
  layout.domainNodes = [];
  layout.informationFlows = [];
  return layout;
}

function capabilityOverviewRelations(pulse) {
  const behaviorById = new Map(pulse.behaviors.map(item => [item.id, item]));
  const relations = new Map();
  for (const flow of pulse.flows) {
    const target = behaviorById.get(flow.to)?.capability;
    if (!target) continue;
    if ('trigger' in flow) {
      const source = `external:${flow.pulse}`;
      const key = `${source}\u0000${flow.pulse}\u0000${target}`;
      if (!relations.has(key)) relations.set(key, {
        trigger: source,
        triggerLabel: pulse.pulses.find(item => item.id === flow.pulse)?.name || flow.trigger,
        pulse: flow.pulse,
        to: target,
      });
      continue;
    }
    const source = behaviorById.get(flow.from)?.capability;
    if (!source || source === target) continue;
    const key = `${source}\u0000${flow.pulse}\u0000${target}`;
    if (!relations.has(key)) relations.set(key, {from: source, pulse: flow.pulse, to: target});
  }
  return [...relations.values()];
}

function capabilityProjections(pulse) {
  const behaviorById = new Map(pulse.behaviors.map(item => [item.id, item]));
  const overview = {
    behaviors: pulse.capabilities.map(item => ({...item})),
    flows: capabilityOverviewRelations(pulse),
    capabilityIds: pulse.capabilities.map(item => item.id), boundaryIds: [],
  };
  const details = pulse.capabilities.map(capability => {
    const behaviors = pulse.behaviors.filter(behavior => behavior.capability === capability.id);
    const boundary = new Map();
    const flows = [];
    const projectedFlowKeys = new Set();
    const addProjectedFlow = flow => {
      const key = 'trigger' in flow
        ? `trigger:${flow.trigger}\u0000${flow.pulse}\u0000${flow.to}`
        : `from:${flow.from}\u0000${flow.pulse}\u0000${flow.to}`;
      if (projectedFlowKeys.has(key)) return;
      projectedFlowKeys.add(key);
      flows.push(flow);
    };
    for (const flow of pulse.flows) {
      const destinationCapability = behaviorById.get(flow.to).capability;
      if ('trigger' in flow) { if (destinationCapability === capability.id) addProjectedFlow({...flow}); continue; }
      const sourceCapability = behaviorById.get(flow.from).capability;
      if (sourceCapability === capability.id && destinationCapability === capability.id) addProjectedFlow({...flow});
      else if (sourceCapability === capability.id) {
        const id = `boundary-to-${destinationCapability}`;
        boundary.set(id, {id, name: `TO ${pulse.capabilities.find(item => item.id === destinationCapability).name}`});
        addProjectedFlow({...flow, to: id});
      } else if (destinationCapability === capability.id) {
        const label = `FROM ${pulse.capabilities.find(item => item.id === sourceCapability).name}`;
        const source = `${label} · ${flow.pulse}`;
        const id = `trigger:${source}`;
        addProjectedFlow({trigger: source, triggerLabel: label, pulse: flow.pulse, to: flow.to});
        boundary.set(id, null);
      }
    }
    return {capability, behaviors: [...behaviors, ...boundary.values()].filter(Boolean), flows, boundaryIds: [...boundary.keys()]};
  });
  return {overview, details};
}

export function layoutPulse(pulse, options = {}) {
  if (!('capabilities' in pulse)) {
    const page = causalPage(pulse, {behaviors: pulse.behaviors, flows: pulse.flows}, 'SYSTEM PULSE', 'system', options);
    return {...page, pages: [page]};
  }
  const {overview, details} = capabilityProjections(pulse);
  const pages = [causalPage(pulse, overview, 'PULSE CAPABILITY OVERVIEW', 'overview', options)];
  for (const detail of details) pages.push(causalPage(pulse, detail, `CAPABILITY: ${detail.capability.name}`, 'capability-detail', options));
  return {pages};
}
