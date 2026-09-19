#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('output/model');
const data = JSON.parse(fs.readFileSync(path.join(out, 'model.json'), 'utf8'));

function decorate(root, {name, model, requirements}) {
  const svg = root.querySelector('svg');
  const namespace = 'http://www.w3.org/2000/svg';
  const groups = [...svg.querySelectorAll('g[class]')];
  const decoded = group => {
    try { return atob(group.getAttribute('class')); } catch { return ''; }
  };
  const find = id => groups.find(group => decoded(group) === id);
  const connections = groups.filter(group => group.querySelector(':scope > path.connection'));
  const element = (tag, attributes, text) => {
    const result = document.createElementNS(namespace, tag);
    Object.entries(attributes).forEach(([key, value]) => result.setAttribute(key, value));
    if (text !== undefined) result.textContent = text;
    return result;
  };
  const clickable = (group, key, label) => {
    if (!group) throw Error(`Missing SVG element: ${key}`);
    group.dataset.key = key;
    group.dataset.label = label;
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', label);
    group.append(element('title', {}, `${label} - show attached requirements`));
    const connection = group.querySelector(':scope > path.connection');
    if (connection) {
      const hitArea = element('path', {
        d: connection.getAttribute('d'),
        stroke: 'transparent',
        'stroke-width': 20,
        fill: 'none',
        'pointer-events': 'stroke',
        'aria-hidden': 'true',
      });
      group.insertBefore(hitArea, connection);
    }
  };

  if (name === 'context') {
    [model.system, ...model.parties].forEach(item => clickable(
      find(item.id),
      `context.${item === model.system ? 'system' : 'party'}.${item.id}`,
      item.name,
    ));
    model.flows.forEach((flow, index) => {
      const group = connections[index];
      const connection = group.querySelector(':scope > path.connection');
      clickable(group, `context.flow.${flow.id}`, flow.name);
      connection.removeAttribute('mask');
      if (flow.initiative) {
        const length = connection.getTotalLength();
        const point = connection.getPointAtLength(flow.initiative === flow.from ? 26 : length - 28);
        group.append(element('circle', {
          cx: point.x,
          cy: point.y,
          r: 6,
          fill: 'white',
          stroke: '#0D32B2',
          'stroke-width': 2,
          'data-initiative': flow.initiative,
        }));
      }
    });
    const paths = connections.map(group => group.querySelector(':scope > path.connection'));
    const samples = paths.flatMap(connection => {
      const count = Math.ceil(connection.getTotalLength() / 3);
      return Array.from({length: count + 1}, (_, index) =>
        connection.getPointAtLength(connection.getTotalLength() * index / count));
    });
    for (const group of connections) {
      const text = group.querySelector(':scope > text');
      const original = Number(text.getAttribute('y'));
      let placed = false;
      for (const delta of [-24, 24, -36, 36, -48, 48, -60, 60]) {
        text.setAttribute('y', original + delta);
        const box = text.getBBox();
        const intersects = samples.some(point =>
          point.x >= box.x - 8 && point.x <= box.x + box.width + 8 &&
          point.y >= box.y - 8 && point.y <= box.y + box.height + 8);
        if (!intersects) { placed = true; break; }
      }
      if (!placed) throw Error('Cannot establish Context label clearance');
    }
  }

  if (name === 'pulse') {
    model.behaviors.forEach(item => clickable(find(item.id), `pulse.behavior.${item.id}`, item.name));
    model.flows.forEach((flow, index) => {
      const pulse = model.pulses.find(item => item.id === flow.pulse);
      const group = connections[index];
      const connection = group.querySelector(':scope > path.connection');
      const point = connection.getPointAtLength(connection.getTotalLength() / 2);
      clickable(group, `pulse.pulse.${pulse.id}`, pulse.name);
      group.append(element('circle', {
        cx: point.x,
        cy: point.y,
        r: 17,
        fill: 'white',
        stroke: '#0D32B2',
        'stroke-width': 2,
        'data-pulse': pulse.id,
      }));
      group.append(element('text', {
        x: point.x,
        y: point.y + 5,
        'text-anchor': 'middle',
        'font-size': 14,
        'font-family': 'Arial',
        fill: '#0A0F25',
      }, pulse.display));
    });
  }

  if (name === 'ui') {
    model.views.forEach(view => {
      clickable(find(view.id), `ui.view.${view.id}`, view.name);
      for (const [kind, targetKind] of [['actions', 'action'], ['information', 'info']]) {
        (view[kind] || []).forEach(item => clickable(
          find(`${view.id}.${kind}.${item.id}`),
          `ui.${targetKind}.${view.id}.${item.id}`,
          item.name,
        ));
      }
    });
  }

  if (name === 'deployment') {
    model.hosts.forEach(host => clickable(find(host.id), `deployment.host.${host.id}`, host.name));
    model.programs.forEach(program => {
      const prefix = `${program.host}.${program.id}`;
      clickable(find(prefix), `deployment.program.${program.id}`, program.name);
      (program.ports || []).forEach(port => clickable(
        find(`${prefix}.ports.${port.id}`),
        `deployment.program.${program.id}.port.${port.id}`,
        port.name,
      ));
      (program.services || []).forEach(service => {
        const servicePrefix = `${prefix}.services.${service.id}`;
        clickable(find(servicePrefix), `deployment.service.${program.id}.${service.id}`, service.name);
        (service.ports || []).forEach(port => clickable(
          find(`${servicePrefix}.ports.${port.id}`),
          `deployment.service.${program.id}.${service.id}.port.${port.id}`,
          port.name,
        ));
      });
    });
    model.connections.forEach((connection, index) => clickable(
      connections[index],
      `deployment.connection.${connection.id}`,
      connection.name,
    ));
  }

  for (const group of [...svg.querySelectorAll('g[data-key]')]) {
    if (!(requirements[group.dataset.key] || []).length) continue;
    const text = group.querySelector(':scope > text');
    const box = text.getBBox();
    let x = box.x + box.width + 16;
    let y = box.y + box.height / 2;
    if (name === 'pulse') {
      const rectangle = group.querySelector(':scope > g.shape > rect');
      if (rectangle) {
        x = Number(rectangle.getAttribute('x')) + Number(rectangle.getAttribute('width')) - 13;
        y = Number(rectangle.getAttribute('y')) + 13;
      } else {
        const symbol = group.querySelector(':scope > circle[data-pulse]');
        x = Number(symbol.getAttribute('cx'));
        const center = Number(symbol.getAttribute('cy'));
        const shapes = [...svg.querySelectorAll('g.shape > rect')].map(item => item.getBBox());
        const candidate = [-34, 34].map(delta => center + delta).find(candidateY =>
          !shapes.some(shape => x + 14 >= shape.x && x - 14 <= shape.x + shape.width &&
            candidateY + 14 >= shape.y && candidateY - 14 <= shape.y + shape.height));
        if (candidate === undefined) throw Error(`No clear requirement badge position: ${group.dataset.key}`);
        y = candidate;
      }
    }
    const badge = element('g', {
      'data-key': group.dataset.key,
      'data-label': group.dataset.label,
      'data-requirement-badge': 'true',
      role: 'button',
      tabindex: 0,
      'aria-label': `Requirements for ${group.dataset.label}`,
    });
    badge.append(element('circle', {cx: x, cy: y, r: 9, fill: 'white', stroke: '#475569', 'stroke-width': 1.5}));
    badge.append(element('text', {
      x,
      y: y + 4,
      'text-anchor': 'middle',
      'font-size': 12,
      'font-family': 'Arial',
      fill: '#334155',
      'pointer-events': 'none',
    }, 'r'));
    badge.append(element('title', {}, `Show ${requirements[group.dataset.key].length} attached requirements for ${group.dataset.label}`));
    group.append(badge);
  }

  const drawing = svg.querySelector('svg.d2-svg');
  const box = drawing.getAttribute('viewBox').split(/\s+/).map(Number);
  drawing.append(element('text', {
    x: box[0] + 12,
    y: box[1] + box[3] + 15,
    'font-family': 'Arial',
    'font-size': 12,
    fill: '#475569',
  }, 'r in a circle = directly attached requirements'));
  drawing.setAttribute('viewBox', [box[0], box[1], box[2], box[3] + 28].join(' '));
  drawing.setAttribute('height', Number(drawing.getAttribute('height')) + 28);
  const outer = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  svg.setAttribute('viewBox', [outer[0], outer[1], outer[2], outer[3] + 28].join(' '));
}

const names = ['context', 'pulse', 'ui', 'deployment'];
const svgs = Object.fromEntries(names.map(name =>
  [name, fs.readFileSync(path.join(out, `${name}.raw.svg`), 'utf8')]));
const embeddedData = JSON.stringify(data).replaceAll('<', '\\u003c');
const decorateSource = decorate.toString();
const sections = names.map(name => `
  <section id="${name}">
    <h2>${name === 'ui' ? 'UI' : name[0].toUpperCase() + name.slice(1)}</h2>
    <div class="diagram">${svgs[name]}</div>
    ${name === 'pulse' ? `<div class="legend">${data.models.pulse.pulses.map(pulse => `${pulse.display} - ${pulse.name}`).join(' &nbsp; · &nbsp; ')}</div>` : ''}
  </section>`).join('');

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${data.systemName} - CPU model</title>
<style>
  body{margin:0;background:#f4f5f8;color:#182238;font:16px system-ui}
  header{padding:24px 32px;background:white;border-bottom:1px solid #ddd}
  h1{margin:0 0 8px;font-size:25px}
  main{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;padding:24px}
  section,aside{background:white;border:1px solid #ddd;border-radius:12px;padding:20px}
  section{margin-bottom:20px} h2{margin-top:0} svg{width:100%;height:auto}
  #deployment .diagram{overflow-x:auto} #deployment svg{min-width:900px}
  g[data-key]{cursor:pointer} g[data-key]:focus{outline:none}
  g[data-key]:hover>text,g[data-key]:focus>text{text-decoration:underline}
  g[data-requirement-badge]:focus>circle{stroke:#b32400;stroke-width:3}
  g[data-requirement-badge]:hover>circle{fill:#fff3df}
  aside{position:sticky;top:20px;align-self:start} li{margin-bottom:12px}
  code{overflow-wrap:anywhere;font-size:12px}.legend{margin-top:16px;font-size:14px}
  .selected>text{fill:#b32400!important}
  @media(max-width:900px){main{grid-template-columns:1fr}aside{position:static;grid-row:1}}
</style>
<header><h1>${data.systemName}</h1>${data.reviewTitle} · D2 0.9.0 · ELK · Select a circle marked “r” to inspect attached requirements.</header>
<main><div>${sections}</div>
<aside><h2 id="selection">Attached requirements</h2><code id="key"></code><div id="detail">Select a model element.</div></aside></main>
<script>
const data=${embeddedData};
const decorate=${decorateSource};
for(const name of ${JSON.stringify(names)}) decorate(document.querySelector('#'+name),{name,model:data.models[name],requirements:data.requirements});
function select(group){
  document.querySelectorAll('.selected').forEach(element=>element.classList.remove('selected'));
  group.classList.add('selected');
  document.querySelector('#selection').textContent=group.dataset.label;
  document.querySelector('#key').textContent=group.dataset.key;
  const detail=document.querySelector('#detail'); detail.replaceChildren();
  const items=data.requirements[group.dataset.key]||[];
  if(!items.length){detail.textContent='No requirements are directly attached to this element.';return;}
  const list=document.createElement('ul');
  items.forEach(text=>{const item=document.createElement('li');item.textContent=text;list.append(item)});
  detail.append(list);
}
document.querySelectorAll('g[data-key]').forEach(group=>{
  group.addEventListener('click',event=>{event.stopPropagation();select(group)});
  group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();select(group)}});
});
for(const key of Object.keys(data.requirements)){
  if(!document.querySelector('[data-requirement-badge][data-key="'+CSS.escape(key)+'"]')) throw Error('Missing requirement badge: '+key);
}
</script>
</html>`;

fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('Interactive review ready:', path.join(out, 'index.html'));
