#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

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
    const pathSamples = paths.map(connection => {
      const length = connection.getTotalLength();
      const count = Math.ceil(length / 3);
      return Array.from({length: count + 1}, (_, index) =>
        connection.getPointAtLength(length * index / count));
    });
    const placedLabelBoxes = [];
    for (const [index, group] of connections.entries()) {
      const text = group.querySelector(':scope > text');
      const original = Number(text.getAttribute('y'));
      const ownSamples = pathSamples[index];
      const originalBox = text.getBBox();
      const centerX = originalBox.x + originalBox.width / 2;
      const nearest = ownSamples.reduce((best, point) =>
        Math.abs(point.x - centerX) < Math.abs(best.x - centerX) ? point : best);
      const preferredY = nearest.y - 10;
      const candidates = Array.from({length: 25}, (_, step) =>
        step === 0 ? preferredY - original : (preferredY - original) + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * 4);
      let placed = false;
      for (const delta of candidates) {
        text.setAttribute('y', original + delta);
        const box = text.getBBox();
        const intersectsOtherPath = pathSamples.some((samples, pathIndex) =>
          pathIndex !== index && samples.some(point =>
            point.x >= box.x - 6 && point.x <= box.x + box.width + 6 &&
            point.y >= box.y - 5 && point.y <= box.y + box.height + 5));
        const intersectsLabel = placedLabelBoxes.some(other =>
          box.x - 6 <= other.x + other.width + 6 &&
          box.x + box.width + 6 >= other.x - 6 &&
          box.y - 3 <= other.y + other.height + 3 &&
          box.y + box.height + 3 >= other.y - 3);
        if (!intersectsOtherPath && !intersectsLabel) {
          placedLabelBoxes.push({x:box.x,y:box.y,width:box.width,height:box.height});
          placed = true;
          break;
        }
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
      for (const subviewId of (view.includes || [])) {
        const group = find(`${view.id}.included_subview_${subviewId}`);
        if (!group) throw Error(`Missing included SubView SVG element: ${view.id} / ${subviewId}`);
        const rectangle = group.querySelector(':scope > g.shape > rect');
        const textNode = group.querySelector(':scope > text');
        if (!rectangle || !textNode) throw Error(`Incomplete included SubView SVG element: ${view.id} / ${subviewId}`);
        const textBox = textNode.getBBox();
        const padX = 10;
        const padY = 6;
        const x = textBox.x - padX;
        const y = textBox.y - padY;
        const width = textBox.width + 2 * padX;
        const height = textBox.height + 2 * padY;
        rectangle.setAttribute('x', x);
        rectangle.setAttribute('y', y);
        rectangle.setAttribute('width', width);
        rectangle.setAttribute('height', height);
        rectangle.setAttribute('rx', 4);
        rectangle.setAttribute('style', 'stroke-width:2;stroke-dasharray:5,4;');
      }
      for (const [kind, targetKind] of [['actions', 'action'], ['information', 'info']]) {
        (view[kind] || []).forEach(item => {
          const group = find(`${view.id}.${kind}.${item.id}`);
          clickable(group, `ui.${targetKind}.${view.id}.${item.id}`, item.name);
          const rectangle = group.querySelector(':scope > g.shape > rect');
          const textNode = group.querySelector(':scope > text');
          if (!rectangle || !textNode) throw Error(`Incomplete UI item SVG element: ${view.id} / ${kind} / ${item.id}`);
          const labelX = Number(rectangle.getAttribute('x')) + 8;
          textNode.setAttribute('text-anchor', 'start');
          textNode.setAttribute('x', labelX);
          textNode.querySelectorAll(':scope > tspan').forEach(span => span.setAttribute('x', labelX));
        });
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
    const paths = connections.map(group => group.querySelector(':scope > path.connection'));
    const pathSamples = paths.map(connection => {
      const length = connection.getTotalLength();
      const count = Math.ceil(length / 3);
      return Array.from({length: count + 1}, (_, index) =>
        connection.getPointAtLength(length * index / count));
    });
    const placedLabelBoxes = [];
    for (const [index, group] of connections.entries()) {
      const text = group.querySelector(':scope > text');
      if (!text) continue;
      paths[index].removeAttribute('mask');
      const original = Number(text.getAttribute('y'));
      const ownSamples = pathSamples[index];
      const originalBox = text.getBBox();
      const centerX = originalBox.x + originalBox.width / 2;
      const nearest = ownSamples.reduce((best, point) =>
        Math.abs(point.x - centerX) < Math.abs(best.x - centerX) ? point : best);
      const preferredY = nearest.y - 10;
      const candidates = Array.from({length: 25}, (_, step) =>
        step === 0 ? preferredY - original : (preferredY - original) + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * 4);
      let placed = false;
      for (const delta of candidates) {
        text.setAttribute('y', original + delta);
        const box = text.getBBox();
        const intersectsOtherPath = pathSamples.some((samples, pathIndex) =>
          pathIndex !== index && samples.some(point =>
            point.x >= box.x - 6 && point.x <= box.x + box.width + 6 &&
            point.y >= box.y - 5 && point.y <= box.y + box.height + 5));
        const intersectsLabel = placedLabelBoxes.some(other =>
          box.x - 6 <= other.x + other.width + 6 &&
          box.x + box.width + 6 >= other.x - 6 &&
          box.y - 3 <= other.y + other.height + 3 &&
          box.y + box.height + 3 >= other.y - 3);
        if (!intersectsOtherPath && !intersectsLabel) {
          placedLabelBoxes.push({x: box.x, y: box.y, width: box.width, height: box.height});
          placed = true;
          break;
        }
      }
      if (!placed) throw Error('Cannot establish Deployment label clearance');
    }
  }

  for (const group of [...svg.querySelectorAll('g[data-key]')]) {
    if (!(requirements[group.dataset.key] || []).length) continue;
    const text = group.querySelector(':scope > text');
    const box = text.getBBox();
    let x = box.x + box.width + 16;
    if (name === 'ui' && /^(ui\.(?:action|info|subview-action|subview-info)\.)/.test(group.dataset.key)) {
      const shape = group.querySelector(':scope > g.shape > rect');
      if (!shape) throw Error('UI item has no layout rectangle: ' + group.dataset.key);
      x = Number(shape.getAttribute('x')) + Number(shape.getAttribute('width')) - 18;

    }
    let y = box.y + box.height / 2;
    if (name === 'ui') {
      const spans = [...text.querySelectorAll(':scope > tspan')];
      group.dataset.requirementGeometry = JSON.stringify({
        key: group.dataset.key,
        label: text.textContent.trim(),
        textBox: {x: box.x, y: box.y, width: box.width, height: box.height},
        spans: spans.map(span => {
          const b = span.getBBox();
          return {text: span.textContent.trim(), x: b.x, y: b.y, width: b.width, height: b.height};
        }),
        anchor: {x, y},
      });
    }
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
      ...(group.dataset.requirementGeometry ? {'data-requirement-geometry': group.dataset.requirementGeometry} : {}),
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
  const margin = 20;
  const contentBottom = box[1] + box[3];
  let footerY = contentBottom + 18;
  if (name === 'pulse') {
    drawing.append(element('text', {
      x: box[0] + 12,
      y: footerY,
      'font-family': 'Arial',
      'font-size': 12,
      'font-weight': 'bold',
      fill: '#334155',
    }, 'PULSES'));
    footerY += 16;
    for (const pulse of model.pulses) {
      drawing.append(element('text', {
        x: box[0] + 12,
        y: footerY,
        'font-family': 'Arial',
        'font-size': 12,
        fill: '#475569',
      }, `${pulse.display}  ${pulse.name}`));
      footerY += 16;
    }
    footerY += 4;
  }
  const legendX = box[0] + 12;
  const legend = element('g', {'data-requirement-legend': 'true'});
  legend.append(element('circle', {cx: legendX + 8, cy: footerY - 4, r: 8, fill: 'white'}));
  drawing.append(legend);
  drawing.append(element('text', {
    x: legendX + 38,
    y: footerY,
    'font-family': 'Arial',
    'font-size': 12,
    fill: '#475569',
  }, 'directly attached requirements'));
  const bottomExtra = footerY + 12 - contentBottom;
  drawing.setAttribute('viewBox', [box[0] - margin, box[1] - margin, box[2] + 2 * margin, box[3] + margin + bottomExtra].join(' '));
  drawing.setAttribute('width', Number(drawing.getAttribute('width')) + 2 * margin);
  drawing.setAttribute('height', Number(drawing.getAttribute('height')) + margin + bottomExtra);
  const outer = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  svg.setAttribute('viewBox', [outer[0] - margin, outer[1] - margin, outer[2] + 2 * margin, outer[3] + margin + bottomExtra].join(' '));
}

const names = ['context', 'pulse', 'ui', 'deployment'];
const svgs = Object.fromEntries(names.map(name =>
  [name, fs.readFileSync(path.join(out, `${name}.raw.svg`), 'utf8')]));
const embeddedData = JSON.stringify(data).replaceAll('<', '\\u003c');
const decorateSource = decorate.toString();
const escapeHtml = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const sections = names.map(name => `
  <section id="${name}" class="model-card">
    <h2>${name === 'ui' ? 'UI' : name[0].toUpperCase() + name.slice(1)}</h2>
    <div class="diagram">${svgs[name]}</div>

  </section>`).join('');
const sourceSections = Object.entries(data.sources || {}).map(([name, source], index) => `
  <details class="source-card"${index === 0 ? ' open' : ''}>
    <summary><span>${name}</span><span class="source-hint">Visa källa</span></summary>
    <pre><code>${escapeHtml(source)}</code></pre>
  </details>`).join('');

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${data.systemName} · CPU Model Explorer</title>
<style>
  :root{color-scheme:light;--ink:#14213d;--muted:#62708a;--line:#dce3ee;--card:#fff;--accent:#3157d5;--accent-soft:#eef2ff;--surface:#f4f7fb}
  *{box-sizing:border-box}html{scroll-behavior:smooth}
  body{margin:0;overflow-x:hidden;background:linear-gradient(180deg,#edf2ff 0,#f7f9fc 260px);color:var(--ink);font:16px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  header{padding:42px max(24px,calc((100vw - 1280px)/2));background:radial-gradient(circle at 85% 10%,#5c79e8 0,transparent 34%),linear-gradient(135deg,#102253,#253f99);color:white}
  .eyebrow{display:inline-flex;padding:5px 10px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff14;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
  h1{margin:14px 0 8px;font-size:clamp(30px,5vw,54px);line-height:1.05;letter-spacing:-.03em}
  header p{max-width:760px;margin:0;color:#e1e8ff;font-size:17px}.meta{margin-top:16px;color:#cbd7ff;font-size:13px}
  nav{position:sticky;top:0;z-index:20;display:flex;gap:8px;padding:10px max(20px,calc((100vw - 1280px)/2));overflow-x:auto;background:#ffffffee;border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}
  nav a{flex:none;padding:8px 13px;border-radius:999px;color:var(--ink);font-size:14px;font-weight:650;text-decoration:none}nav a:hover{background:var(--accent-soft);color:var(--accent)}
  main{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:24px;width:100%;max-width:1280px;margin:auto;padding:28px 24px 64px}
  main>div,main>aside,.model-card,.diagram{min-width:0;max-width:100%}
  .model-card,aside,.source-card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 35px #2337710d}
  .model-card{margin-bottom:24px;padding:24px;scroll-margin-top:72px}.model-card h2{margin:0 0 18px;font-size:22px;letter-spacing:-.01em}
  .diagram{overflow:hidden;border-radius:12px;background:#fbfcff}.diagram svg{display:block;width:100%;max-width:100%;height:auto}
  g[data-key]{cursor:pointer} g[data-key]:focus{outline:none}
  g[data-key]:hover>text,g[data-key]:focus>text{text-decoration:underline}
  g[data-requirement-badge]:focus>circle{stroke:#b32400;stroke-width:3}
  g[data-requirement-badge]:hover>circle{fill:#fff3df}
  aside{position:sticky;top:72px;align-self:start;padding:22px}aside h2{margin:0 0 8px;font-size:20px}aside li{margin-bottom:12px}
  aside code{display:block;margin-bottom:15px;color:var(--accent);overflow-wrap:anywhere;font-size:12px}.legend{margin-top:16px;color:var(--muted);font-size:14px}
  .sources{grid-column:1/-1;scroll-margin-top:72px}.sources>h2{margin:12px 0 6px;font-size:28px}.sources>p{margin:0 0 18px;color:var(--muted)}
  .source-card{margin-bottom:12px;overflow:hidden}.source-card summary{display:flex;justify-content:space-between;gap:20px;padding:16px 20px;cursor:pointer;font-weight:700;list-style:none}.source-card summary::-webkit-details-marker{display:none}.source-card[open] summary{border-bottom:1px solid var(--line);background:var(--accent-soft)}
  .source-hint{color:var(--muted);font-size:13px;font-weight:500}.source-card pre{margin:0;padding:20px;overflow:auto;background:#101827;color:#dce7ff;font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.source-card code{font:inherit}
  .selected>text{fill:#b32400!important}
  @media(max-width:900px){header{padding:32px 20px}main{grid-template-columns:minmax(0,1fr);padding:18px 12px 48px}.model-card{padding:16px}aside{position:static;grid-row:1}.sources{grid-column:1}.source-card pre{font-size:12px;padding:14px}}
</style>
<header><span class="eyebrow">CPU Model Explorer</span><h1>${data.systemName}</h1><p>Utforska Context, Pulse, UI och den konkreta driftsättningen. Välj en cirkel märkt “r” för att läsa elementets exakta krav.</p><div class="meta">${data.reviewTitle} · D2 0.9.0 · ELK</div></header>
<nav aria-label="Modellens delar"><a href="#context">Context</a><a href="#pulse">Pulse</a><a href="#ui">UI</a><a href="#deployment">Deployment</a><a href="#yaml">YAML-källor</a></nav>
<main><div>${sections}</div>
<aside><h2 id="selection">Bifogade krav</h2><code id="key"></code><div id="detail">Välj ett modellelement.</div></aside>
<div class="sources" id="yaml"><h2>YAML-källor</h2><p>De semantiska källfilerna som diagrammen genereras från.</p>${sourceSections}</div></main>
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
  if(!items.length){detail.textContent='Inga krav är direkt kopplade till detta element.';return;}
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

const indexPath = path.join(out, 'index.html');
fs.writeFileSync(indexPath, html.replace(/[ \t]+$/gm, ''));

// Materialize the browser-decorated diagrams as durable standalone SVGs.
// This deliberately uses a real browser geometry engine: Visual Language v1
// requires positions derived from the actual rendered SVG geometry.
const browser = process.env.CPU_REVIEW_BROWSER;
if (browser) {
  const materializeScript = `
    const names = ${JSON.stringify(names)};
    const payload = {};
    for (const name of names) payload[name] = document.querySelector('#' + name + ' .diagram > svg').outerHTML;
    document.body.replaceChildren(document.createTextNode(JSON.stringify(payload)));
  `;
  const closingTag = '</html>';
  const closingIndex = html.lastIndexOf(closingTag);
  if (closingIndex < 0) throw Error('Generated review HTML has no closing html tag');
  const materializeHtml = html.slice(0, closingIndex) + '<script>' + materializeScript + '</script>\n' + html.slice(closingIndex);
  const materializePath = path.join(out, '.materialize.html');
  fs.writeFileSync(materializePath, materializeHtml);
  try {
    const dumped = execFileSync(browser, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--dump-dom',
      'file://' + materializePath,
    ], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
    const bodyStart = dumped.indexOf('<body>');
    const bodyEnd = dumped.lastIndexOf('</body>');
    const body = bodyStart >= 0 && bodyEnd > bodyStart ? dumped.slice(bodyStart + 6, bodyEnd) : null;
    if (!body) throw Error('Browser did not return a materialized review body');
    const decoded = body
      .replaceAll('&quot;', '"').replaceAll('&#39;', "'")
      .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
    const materialized = JSON.parse(decoded);
    for (const name of names) fs.writeFileSync(path.join(out, name + '.svg'), materialized[name]);
    execFileSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'pdf_review_native.mjs'), out], {
      stdio: 'inherit',
      env: process.env,
    });
    const publishDir = process.env.CPU_REVIEW_PUBLISH_DIR || path.resolve(out, '..');
    fs.mkdirSync(publishDir, {recursive: true});
    for (const name of names) fs.copyFileSync(path.join(out, name + '.pdf'), path.join(publishDir, name + '.pdf'));
  } finally {
    fs.rmSync(materializePath, {force: true});
  }
}
console.log('Interactive review ready:', indexPath);
