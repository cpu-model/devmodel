#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const {parseDocument} = createRequire(import.meta.url)('yaml');

function parseArgs(argv) {
  const result = {
    source: path.resolve('CPU'),
    out: path.resolve('output/model'),
    reviewTitle: 'Model review',
    d2: process.env.D2_BIN || 'd2',
    finish: true,
    validateOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source') result.source = path.resolve(argv[++index]);
    else if (argument === '--out') result.out = path.resolve(argv[++index]);
    else if (argument === '--review-title') result.reviewTitle = argv[++index];
    else if (argument === '--d2') result.d2 = argv[++index];
    else if (argument === '--no-finish') result.finish = false;
    else if (argument === '--validate-only') result.validateOnly = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return result;
}

function loadYaml(directory, name) {
  const filename = path.join(directory, `${name}.yaml`);
  const source = fs.readFileSync(filename, 'utf8');
  const document = parseDocument(source, {uniqueKeys: true, strict: true});
  if (document.errors.length) {
    throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  }
  return document.toJS({mapAsMap: false});
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a mapping`);
  }
  return value;
}

function fields(value, allowed, required, label) {
  object(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) {
    throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
  }
}

function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}

function unique(items, label, key = 'id') {
  list(items, label);
  const values = items.map((item, index) => {
    object(item, `${label}[${index}]`);
    const value = item[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${label}[${index}].${key} must be a non-empty string`);
    }
    if (key === 'id' && value.includes('.')) {
      throw new Error(`${label}[${index}].id must not contain a period`);
    }
    return value;
  });
  if (new Set(values).size !== values.length) throw new Error(`${label}.${key} values must be unique`);
}

const quote = value => JSON.stringify(value);

function node(key, label, shape = 'rectangle', extra = '') {
  return `${quote(key)}: ${quote(label)} {\n shape: ${shape}\n ${extra}\n}`;
}

function validateRoot(source, name) {
  fields(source, [name], [name], `${name}.yaml`);
  return object(source[name], name);
}

function contextD2(context, targets) {
  fields(context, ['system', 'parties', 'flows'], ['system', 'parties', 'flows'], 'context');
  fields(context.system, ['id', 'name'], ['id', 'name'], 'context.system');
  unique([context.system, ...list(context.parties, 'context.parties')], 'context endpoints');
  unique(list(context.flows, 'context.flows'), 'context.flows');
  const ids = new Set([context.system, ...context.parties].map(item => item.id));
  targets.add(`context.system.${context.system.id}`);
  const lines = ['direction: right', node(context.system.id, context.system.name, 'rectangle', 'style.stroke-width: 3')];
  for (const party of context.parties) {
    fields(party, ['id', 'name', 'type'], ['id', 'name', 'type'], `context.party.${party.id}`);
    if (!['person', 'external-system'].includes(party.type)) throw new Error(`Invalid party type: ${party.type}`);
    targets.add(`context.party.${party.id}`);
    lines.push(node(
      party.id,
      party.name,
      party.type === 'person' ? 'person' : 'rectangle',
      party.type === 'person' ? '' : 'style.border-radius: 12',
    ));
  }
  for (const flow of context.flows) {
    fields(flow, ['id', 'from', 'to', 'name', 'initiative'], ['id', 'from', 'to', 'name'], `context.flow.${flow.id}`);
    if (!ids.has(flow.from) || !ids.has(flow.to) || flow.from === flow.to) throw new Error(`Invalid Context flow: ${flow.id}`);
    if ('initiative' in flow && ![flow.from, flow.to].includes(flow.initiative)) throw new Error(`Invalid initiative: ${flow.id}`);
    targets.add(`context.flow.${flow.id}`);
    lines.push(`${quote(flow.from)} -> ${quote(flow.to)}: ${quote(flow.name)}`);
  }
  return lines.join('\n');
}

function pulseD2(pulse, targets) {
  fields(pulse, ['behaviors', 'pulses', 'flows'], ['behaviors', 'pulses', 'flows'], 'pulse');
  unique(list(pulse.behaviors, 'pulse.behaviors'), 'pulse.behaviors');
  unique(list(pulse.pulses, 'pulse.pulses'), 'pulse.pulses');
  unique(pulse.pulses, 'pulse.pulses', 'display');
  const behaviorIds = new Set(pulse.behaviors.map(item => item.id));
  const pulses = new Map(pulse.pulses.map(item => [item.id, item]));
  const lines = ['direction: right'];
  for (const behavior of pulse.behaviors) {
    fields(behavior, ['id', 'name'], ['id', 'name'], `pulse.behavior.${behavior.id}`);
    targets.add(`pulse.behavior.${behavior.id}`);
    lines.push(node(behavior.id, behavior.name, 'rectangle', 'style.border-radius: 12'));
  }
  for (const item of pulse.pulses) {
    fields(item, ['id', 'display', 'name'], ['id', 'display', 'name'], `pulse.pulse.${item.id}`);
    targets.add(`pulse.pulse.${item.id}`);
  }
  const triggers = new Map();
  for (const [index, flow] of list(pulse.flows, 'pulse.flows').entries()) {
    fields(flow, ['trigger', 'from', 'pulse', 'to'], ['pulse', 'to'], `pulse.flows[${index}]`);
    if (('trigger' in flow) === ('from' in flow)) throw new Error(`Pulse flow ${index} requires trigger XOR from`);
    if (!pulses.has(flow.pulse) || !behaviorIds.has(flow.to)) throw new Error(`Unresolved Pulse flow ${index}`);
    let source;
    if ('trigger' in flow) {
      if (typeof flow.trigger !== 'string' || !flow.trigger.trim()) throw new Error(`Blank trigger in Pulse flow ${index}`);
      if (!triggers.has(flow.trigger)) {
        triggers.set(flow.trigger, `trigger_${triggers.size}`);
        lines.push(node(triggers.get(flow.trigger), flow.trigger, 'rectangle', 'style.fill: transparent\nstyle.stroke: transparent'));
      }
      source = triggers.get(flow.trigger);
    } else {
      if (!behaviorIds.has(flow.from)) throw new Error(`Unresolved Pulse source in flow ${index}`);
      source = flow.from;
    }
    lines.push(`${quote(source)} -> ${quote(flow.to)}`);
  }
  return lines.join('\n');
}

function uiD2(ui, targets) {
  fields(ui, ['views'], ['views'], 'ui');
  unique(list(ui.views, 'ui.views'), 'ui.views');
  const viewIds = new Set(ui.views.map(view => view.id));
  const lines = ['direction: right'];
  for (const view of ui.views) {
    fields(view, ['id', 'name', 'actions', 'information', 'navigation'], ['id', 'name'], `ui.view.${view.id}`);
    targets.add(`ui.view.${view.id}`);
    lines.push(`${quote(view.id)}: ${quote(view.name)} {\nstyle.border-radius: 12\ngrid-columns: 2\ngrid-gap: 24`);
    for (const [kind, symbol, targetKind] of [['actions', '▶', 'action'], ['information', '●', 'info']]) {
      const items = view[kind] || [];
      unique(items, `ui.view.${view.id}.${kind}`);
      lines.push(`${kind}: "" {\nstyle.stroke: transparent\nstyle.fill: transparent\ngrid-columns: 1\ngrid-gap: 16`);
      for (const item of items) {
        fields(item, ['id', 'name'], ['id', 'name'], `ui.view.${view.id}.${kind}.${item.id}`);
        targets.add(`ui.${targetKind}.${view.id}.${item.id}`);
        lines.push(node(item.id, `${symbol} ${item.name}`, 'rectangle', 'style.stroke: transparent\nstyle.fill: transparent'));
      }
      lines.push('}');
    }
    lines.push('}');
  }
  for (const view of ui.views) {
    for (const [index, navigation] of (view.navigation || []).entries()) {
      fields(navigation, ['to'], ['to'], `ui.view.${view.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to) || navigation.to === view.id) throw new Error(`Invalid Navigation from ${view.id}`);
      lines.push(`${quote(view.id)} -> ${quote(navigation.to)}: {style.stroke-dash: 5; style.stroke-width: 1}`);
    }
  }
  return lines.join('\n');
}

function validateRequirements(source, targets) {
  fields(source, ['requirements'], ['requirements'], 'requirements.yaml');
  const requirements = object(source.requirements, 'requirements');
  for (const [target, values] of Object.entries(requirements)) {
    if (!targets.has(target)) throw new Error(`Unresolved requirement target: ${target}`);
    if (!Array.isArray(values) || !values.length || values.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error(`Requirement target ${target} must have a non-empty list of non-empty strings`);
    }
  }
  return requirements;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {stdio: 'inherit', ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(options.out, {recursive: true});
  const models = {
    context: validateRoot(loadYaml(options.source, 'context'), 'context'),
    pulse: validateRoot(loadYaml(options.source, 'pulse'), 'pulse'),
    ui: validateRoot(loadYaml(options.source, 'ui'), 'ui'),
  };
  const targets = new Set();
  const d2 = {
    context: contextD2(models.context, targets),
    pulse: pulseD2(models.pulse, targets),
    ui: uiD2(models.ui, targets),
  };
  const requirements = validateRequirements(loadYaml(options.source, 'requirements'), targets);
  if (options.validateOnly) {
    console.log(`Validated Context, Pulse, UI, and ${Object.keys(requirements).length} requirement targets.`);
    return;
  }
  const version = spawnSync(options.d2, ['--version'], {encoding: 'utf8'});
  if (version.error) throw version.error;
  if (version.status !== 0 || version.stdout.trim() !== 'v0.9.0') {
    throw new Error(`D2 v0.9.0 is required; got ${version.stdout.trim() || 'no version'}`);
  }
  for (const [name, source] of Object.entries(d2)) {
    const d2Path = path.join(options.out, `${name}.d2`);
    fs.writeFileSync(d2Path, source);
    run(options.d2, [
      '--layout=elk', '--elk-nodeNodeBetweenLayers=150', '--pad=35',
      d2Path, path.join(options.out, `${name}.raw.svg`),
    ]);
  }
  fs.writeFileSync(path.join(options.out, 'model.json'), JSON.stringify({
    models,
    requirements,
    reviewTitle: options.reviewTitle,
    systemName: models.context.system.name,
  }, null, 2));
  if (options.finish) run(process.execPath, [path.join(here, 'finish_model.mjs'), options.out]);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
