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
const reference = value => value.split('.').map(quote).join('.');

function node(key, label, shape = 'rectangle', extra = '') {
  return `${quote(key)}: ${quote(label)} {\n shape: ${shape}\n ${extra}\n}`;
}

function validateRoot(source, name) {
  fields(source, [name], [name], `${name}.yaml`);
  return object(source[name], name);
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function optionalBoolean(value, label) {
  if (value !== undefined && typeof value !== 'boolean') throw new Error(`${label} must be true or false`);
}

function contextD2(context, targets) {
  fields(context, ['system', 'parties', 'flows'], ['system', 'parties', 'flows'], 'context');
  fields(context.system, ['id', 'name'], ['id', 'name'], 'context.system');
  nonEmpty(context.system.name, 'context.system.name');
  unique([context.system, ...list(context.parties, 'context.parties')], 'context endpoints');
  unique(list(context.flows, 'context.flows'), 'context.flows');
  const ids = new Set([context.system, ...context.parties].map(item => item.id));
  targets.add(`context.system.${context.system.id}`);
  const lines = ['direction: right', node(context.system.id, context.system.name, 'rectangle', 'style.stroke-width: 3')];
  for (const party of context.parties) {
    fields(party, ['id', 'name', 'type'], ['id', 'name', 'type'], `context.party.${party.id}`);
    nonEmpty(party.name, `context.party.${party.id}.name`);
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
    nonEmpty(flow.name, `context.flow.${flow.id}.name`);
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
    nonEmpty(behavior.name, `pulse.behavior.${behavior.id}.name`);
    targets.add(`pulse.behavior.${behavior.id}`);
    lines.push(node(behavior.id, behavior.name, 'rectangle', 'style.border-radius: 12'));
  }
  for (const item of pulse.pulses) {
    fields(item, ['id', 'display', 'name'], ['id', 'display', 'name'], `pulse.pulse.${item.id}`);
    nonEmpty(item.name, `pulse.pulse.${item.id}.name`);
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
  fields(ui, ['subviews', 'views'], ['views'], 'ui');
  const subviews = ui.subviews || [];
  unique(list(subviews, 'ui.subviews'), 'ui.subviews');
  unique(list(ui.views, 'ui.views'), 'ui.views');
  const viewIds = new Set(ui.views.map(view => view.id));
  const subviewIds = new Set(subviews.map(subview => subview.id));
  for (const id of subviewIds) if (viewIds.has(id)) throw new Error(`UI View and SubView IDs must be distinct: ${id}`);
  const subviewById = new Map(subviews.map(subview => [subview.id, subview]));
  for (const subview of subviews) {
    fields(subview, ['id', 'name', 'navigation'], ['id', 'name'], `ui.subview.${subview.id}`);
    nonEmpty(subview.name, `ui.subview.${subview.id}.name`);
    for (const [index, navigation] of (subview.navigation || []).entries()) {
      fields(navigation, ['to'], ['to'], `ui.subview.${subview.id}.navigation[${index}]`);
      if (!viewIds.has(navigation.to)) throw new Error(`Invalid Navigation from SubView ${subview.id}`);
    }
  }
  const lines = ['direction: right'];
  for (const subview of subviews) {
    lines.push(`${quote(`subview_${subview.id}`)}: ${quote(subview.name)} {\nstyle.border-radius: 12\nstyle.stroke-dash: 4\n}`);
  }
  for (const view of ui.views) {
    fields(view, ['id', 'name', 'includes', 'actions', 'information', 'navigation'], ['id', 'name'], `ui.view.${view.id}`);
    nonEmpty(view.name, `ui.view.${view.id}.name`);
    targets.add(`ui.view.${view.id}`);
    const includes = view.includes || [];
    list(includes, `ui.view.${view.id}.includes`);
    if (includes.some(id => typeof id !== 'string' || !id.trim())) throw new Error(`ui.view.${view.id}.includes must contain non-empty SubView IDs`);
    if (new Set(includes).size !== includes.length) throw new Error(`ui.view.${view.id}.includes must not contain duplicates`);
    for (const id of includes) if (!subviewIds.has(id)) throw new Error(`Unresolved SubView include from ${view.id}: ${id}`);
    lines.push(`${quote(view.id)}: ${quote(view.name)} {\nstyle.border-radius: 12\ngrid-columns: 2\ngrid-gap: 24`);
    for (const id of includes) {
      const subview = subviewById.get(id);
      lines.push(`${quote(`included_subview_${id}`)}: ${quote(subview.name)} {\nstyle.border-radius: 8\nstyle.stroke-dash: 4\n}`);
    }
    for (const [kind, symbol, targetKind] of [['actions', '▶', 'action'], ['information', '●', 'info']]) {
      const items = view[kind] || [];
      unique(items, `ui.view.${view.id}.${kind}`);
      lines.push(`${kind}: "" {\nstyle.stroke: transparent\nstyle.fill: transparent\ngrid-columns: 1\ngrid-gap: 16`);
      for (const item of items) {
        fields(item, ['id', 'name'], ['id', 'name'], `ui.view.${view.id}.${kind}.${item.id}`);
        nonEmpty(item.name, `ui.view.${view.id}.${kind}.${item.id}.name`);
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
  for (const subview of subviews) {
    for (const navigation of (subview.navigation || [])) {
      lines.push(`${quote(`subview_${subview.id}`)} -> ${quote(navigation.to)}: {style.stroke-dash: 5; style.stroke-width: 1}`);
    }
  }
  return lines.join('\n');
}

function deploymentD2(deployment, targets) {
  fields(deployment, ['environment', 'hosts', 'programs', 'connections'], ['hosts', 'programs', 'connections'], 'deployment');
  unique(list(deployment.hosts, 'deployment.hosts'), 'deployment.hosts');
  unique(list(deployment.programs, 'deployment.programs'), 'deployment.programs');
  unique(list(deployment.connections, 'deployment.connections'), 'deployment.connections');

  function validateEnvironment(environment, label) {
    fields(environment, ['file', 'variables'], [], label);
    if ('file' in environment) nonEmpty(environment.file, `${label}.file`);
    const variables = environment.variables || [];
    unique(variables, `${label}.variables`, 'name');
    for (const variable of variables) {
      fields(variable, ['name', 'required', 'default', 'secret'], ['name'], `${label}.variable.${variable.name}`);
      optionalBoolean(variable.required, `${label}.variable.${variable.name}.required`);
      optionalBoolean(variable.secret, `${label}.variable.${variable.name}.secret`);
      if (variable.secret && 'default' in variable) throw new Error(`Secret variable ${variable.name} must not define a default value`);
      if ('default' in variable && !['string', 'number', 'boolean'].includes(typeof variable.default)) {
        throw new Error(`${label}.variable.${variable.name}.default must be scalar`);
      }
    }
  }
  if (deployment.environment !== undefined) validateEnvironment(deployment.environment, 'deployment.environment');

  const hostIds = new Set();
  const endpointIds = new Set();
  const endpointNodes = new Map();
  const lines = ['direction: right'];
  const hostTypes = ['machine', 'virtual-machine', 'cloud-host'];
  const programTypes = ['os-process', 'docker-compose', 'managed-service', 'external-service'];
  const roles = ['server', 'web-ui', 'server-with-web-ui', 'worker', 'database', 'proxy', 'other'];
  const exposures = ['internal', 'host', 'public'];

  function validateRuntime(unit, label, allowWorkingDirectory) {
    if ('command' in unit) nonEmpty(unit.command, `${label}.command`);
    if ('working-directory' in unit) {
      if (!allowWorkingDirectory) throw new Error(`${label}.working-directory is not allowed`);
      nonEmpty(unit['working-directory'], `${label}.working-directory`);
    }
    if (unit.environment !== undefined) validateEnvironment(unit.environment, `${label}.environment`);
    const volumes = unit.volumes || [];
    unique(volumes, `${label}.volumes`);
    for (const volume of volumes) {
      fields(volume, ['id', 'source', 'target', 'read-only'], ['id', 'source', 'target'], `${label}.volume.${volume.id}`);
      nonEmpty(volume.source, `${label}.volume.${volume.id}.source`);
      nonEmpty(volume.target, `${label}.volume.${volume.id}.target`);
      optionalBoolean(volume['read-only'], `${label}.volume.${volume.id}.read-only`);
    }
    if (unit['health-check'] !== undefined) {
      const check = unit['health-check'];
      fields(check, ['type', 'path', 'port', 'command', 'interval'], ['type'], `${label}.health-check`);
      if (!['http', 'tcp', 'command'].includes(check.type)) throw new Error(`${label}.health-check.type is invalid`);
      if (check.type === 'http' && !('path' in check)) throw new Error(`${label}.health-check.path is required for HTTP`);
      if (check.type === 'tcp' && !('port' in check)) throw new Error(`${label}.health-check.port is required for TCP`);
      if (check.type === 'command' && !('command' in check)) throw new Error(`${label}.health-check.command is required for command checks`);
      if (check.type === 'http' && 'command' in check) throw new Error(`${label}.health-check.command is not allowed for HTTP`);
      if (check.type === 'tcp' && ('path' in check || 'command' in check)) throw new Error(`${label}.health-check has fields not allowed for TCP`);
      if (check.type === 'command' && ('path' in check || 'port' in check)) throw new Error(`${label}.health-check has fields not allowed for command checks`);
      if ('path' in check) nonEmpty(check.path, `${label}.health-check.path`);
      if ('command' in check) nonEmpty(check.command, `${label}.health-check.command`);
      if ('interval' in check) nonEmpty(check.interval, `${label}.health-check.interval`);
      if ('port' in check && (!Number.isInteger(check.port) || check.port < 1 || check.port > 65535)) throw new Error(`${label}.health-check.port is invalid`);
    }
    if ('restart' in unit && !['no', 'on-failure', 'always', 'unless-stopped'].includes(unit.restart)) throw new Error(`${label}.restart is invalid`);
    if (unit.resources !== undefined) {
      fields(unit.resources, ['cpu', 'memory'], [], `${label}.resources`);
      if (!('cpu' in unit.resources) && !('memory' in unit.resources)) throw new Error(`${label}.resources requires cpu or memory`);
      for (const key of ['cpu', 'memory']) {
        if (!(key in unit.resources)) continue;
        const value = unit.resources[key];
        if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !value.trim()) || (typeof value === 'number' && value <= 0)) {
          throw new Error(`${label}.resources.${key} must be a non-empty string or positive number`);
        }
      }
    }
  }

  function validatePorts(ports, owner, d2Prefix, targetPrefix, role) {
    unique(ports, `${targetPrefix}.ports`);
    const hasWebPort = ports.some(port => ['http', 'https'].includes(port.application));
    if (['web-ui', 'server-with-web-ui'].includes(role) && !hasWebPort) {
      throw new Error(`${targetPrefix} with role ${role} requires an explicit HTTP or HTTPS port`);
    }
    const result = [];
    for (const port of ports) {
      fields(port, ['id', 'name', 'port', 'host-port', 'transport', 'application', 'exposure'], ['id', 'name', 'port'], `${targetPrefix}.port.${port.id}`);
      nonEmpty(port.name, `${targetPrefix}.port.${port.id}.name`);
      if (!Number.isInteger(port.port) || port.port < 1 || port.port > 65535) throw new Error(`${targetPrefix}.port.${port.id}.port is invalid`);
      if ('host-port' in port) {
        const hostPort = port['host-port'];
        if (Number.isInteger(hostPort)) {
          if (hostPort < 1 || hostPort > 65535) throw new Error(`${targetPrefix}.port.${port.id}.host-port is invalid`);
        } else {
          object(hostPort, `${targetPrefix}.port.${port.id}.host-port`);
          fields(hostPort, ['variable', 'default'], ['variable'], `${targetPrefix}.port.${port.id}.host-port`);
          nonEmpty(hostPort.variable, `${targetPrefix}.port.${port.id}.host-port.variable`);
          if ('default' in hostPort && (!Number.isInteger(hostPort.default) || hostPort.default < 1 || hostPort.default > 65535)) {
            throw new Error(`${targetPrefix}.port.${port.id}.host-port.default is invalid`);
          }
          const declared = new Set([
            ...(deployment.environment?.variables || []).map(variable => variable.name),
            ...(owner.includes('.') ? [] : (deployment.programs.find(program => program.id === owner)?.environment?.variables || []).map(variable => variable.name)),
          ]);
          const [programId, serviceId] = owner.split('.');
          const program = deployment.programs.find(item => item.id === programId);
          for (const variable of program?.environment?.variables || []) declared.add(variable.name);
          for (const variable of program?.services?.find(item => item.id === serviceId)?.environment?.variables || []) declared.add(variable.name);
          if (!declared.has(hostPort.variable)) throw new Error(`${targetPrefix}.port.${port.id}.host-port.variable is not declared in the applicable environment: ${hostPort.variable}`);
        }
      }
      const transport = port.transport || 'tcp';
      if (!['tcp', 'udp'].includes(transport)) throw new Error(`${targetPrefix}.port.${port.id}.transport is invalid`);
      if ('application' in port) nonEmpty(port.application, `${targetPrefix}.port.${port.id}.application`);
      const exposure = port.exposure || 'internal';
      if (!exposures.includes(exposure)) throw new Error(`${targetPrefix}.port.${port.id}.exposure is invalid`);
      const endpoint = `${owner}.${port.id}`;
      endpointIds.add(endpoint);
      const diagramId = `${d2Prefix}.ports.${port.id}`;
      endpointNodes.set(endpoint, diagramId);
      const mapping = 'host-port' in port ? ` → host ${Number.isInteger(port['host-port']) ? port['host-port'] : `env ${port['host-port'].variable}${'default' in port['host-port'] ? ` (default ${port['host-port'].default})` : ''}`}` : '';
      result.push(node(port.id, `${port.name}\n${port.application || transport} ${port.port}${mapping}\n${exposure}`, 'rectangle', 'style.border-radius: 8'));
      targets.add(`${targetPrefix}.port.${port.id}`);
    }
    return result;
  }

  for (const host of deployment.hosts) {
    fields(host, ['id', 'name', 'type', 'os', 'architecture'], ['id', 'name', 'type'], `deployment.host.${host.id}`);
    nonEmpty(host.name, `deployment.host.${host.id}.name`);
    if (!hostTypes.includes(host.type)) throw new Error(`Invalid deployment host type: ${host.type}`);
    if ('os' in host) nonEmpty(host.os, `deployment.host.${host.id}.os`);
    if ('architecture' in host) nonEmpty(host.architecture, `deployment.host.${host.id}.architecture`);
    hostIds.add(host.id);
    targets.add(`deployment.host.${host.id}`);
    const detail = [host.type, host.os, host.architecture].filter(Boolean).join(' · ');
    lines.push(`${quote(host.id)}: ${quote(`${host.name}\n${detail}`)} {\nstyle.stroke-width: 3`);
    for (const program of deployment.programs.filter(item => item.host === host.id)) {
      fields(program, ['id', 'name', 'host', 'type', 'role', 'implementation', 'command', 'working-directory', 'environment', 'ports', 'volumes', 'health-check', 'restart', 'resources', 'services'], ['id', 'name', 'host', 'type'], `deployment.program.${program.id}`);
      nonEmpty(program.name, `deployment.program.${program.id}.name`);
      if (!programTypes.includes(program.type)) throw new Error(`Invalid program type: ${program.type}`);
      if ('role' in program && !roles.includes(program.role)) throw new Error(`Invalid program role: ${program.role}`);
      if (program.implementation !== undefined) {
        fields(program.implementation, ['language', 'platform'], [], `deployment.program.${program.id}.implementation`);
        if ('language' in program.implementation) nonEmpty(program.implementation.language, `deployment.program.${program.id}.implementation.language`);
        if ('platform' in program.implementation) nonEmpty(program.implementation.platform, `deployment.program.${program.id}.implementation.platform`);
      }
      validateRuntime(program, `deployment.program.${program.id}`, true);
      if (['web-ui', 'server-with-web-ui'].includes(program.role) && !program.implementation?.platform) {
        throw new Error(`deployment.program.${program.id} requires an explicitly selected web UI platform`);
      }
      const language = ['server', 'server-with-web-ui'].includes(program.role)
        ? (program.implementation?.language || 'go')
        : program.implementation?.language;
      const implementation = [language, program.implementation?.platform].filter(Boolean).join(' · ');
      const programDetail = [program.type, program.role, implementation].filter(Boolean).join(' · ');
      lines.push(`${quote(program.id)}: ${quote(`${program.name}\n${programDetail}`)} {\nstyle.border-radius: 12`);
      targets.add(`deployment.program.${program.id}`);
      endpointIds.add(program.id);
      endpointNodes.set(program.id, `${host.id}.${program.id}`);
      const programPorts = validatePorts(program.ports || [], program.id, `${host.id}.${program.id}`, `deployment.program.${program.id}`, program.role);
      if (programPorts.length) lines.push('ports: "Ports" {\nstyle.stroke-dash: 4', ...programPorts, '}');

      const services = program.services || [];
      if (program.type === 'docker-compose' && !services.length) throw new Error(`Docker Compose program ${program.id} requires services`);
      if (program.type !== 'docker-compose' && services.length) throw new Error(`Only docker-compose programs may contain services: ${program.id}`);
      unique(services, `deployment.program.${program.id}.services`);
      if (services.length) lines.push('services: "Services" {\nstyle.stroke-dash: 4');
      for (const service of services) {
        fields(service, ['id', 'name', 'role', 'implementation', 'command', 'environment', 'ports', 'volumes', 'health-check', 'restart', 'resources'], ['id', 'name'], `deployment.service.${program.id}.${service.id}`);
        nonEmpty(service.name, `deployment.service.${program.id}.${service.id}.name`);
        if ('role' in service && !roles.includes(service.role)) throw new Error(`Invalid service role: ${service.role}`);
        if (service.implementation !== undefined) {
          fields(service.implementation, ['language', 'platform'], [], `deployment.service.${program.id}.${service.id}.implementation`);
          if ('language' in service.implementation) nonEmpty(service.implementation.language, `deployment.service.${program.id}.${service.id}.implementation.language`);
          if ('platform' in service.implementation) nonEmpty(service.implementation.platform, `deployment.service.${program.id}.${service.id}.implementation.platform`);
        }
        validateRuntime(service, `deployment.service.${program.id}.${service.id}`, false);
        if (['web-ui', 'server-with-web-ui'].includes(service.role) && !service.implementation?.platform) {
          throw new Error(`deployment.service.${program.id}.${service.id} requires an explicitly selected web UI platform`);
        }
        const serviceLanguage = ['server', 'server-with-web-ui'].includes(service.role)
          ? (service.implementation?.language || 'go')
          : service.implementation?.language;
        const serviceDetail = [service.role, serviceLanguage, service.implementation?.platform].filter(Boolean).join(' · ');
        lines.push(`${quote(service.id)}: ${quote(`${service.name}\n${serviceDetail}`)} {\nstyle.border-radius: 12`);
        const serviceEndpoint = `${program.id}.${service.id}`;
        endpointIds.add(serviceEndpoint);
        endpointNodes.set(serviceEndpoint, `${host.id}.${program.id}.services.${service.id}`);
        targets.add(`deployment.service.${program.id}.${service.id}`);
        const servicePorts = validatePorts(service.ports || [], serviceEndpoint, `${host.id}.${program.id}.services.${service.id}`, `deployment.service.${program.id}.${service.id}`, service.role);
        if (servicePorts.length) lines.push('ports: "Ports" {\nstyle.stroke-dash: 4', ...servicePorts, '}');
        lines.push('}');
      }
      if (services.length) lines.push('}');
      lines.push('}');
    }
    lines.push('}');
  }

  for (const program of deployment.programs) {
    if (!hostIds.has(program.host)) throw new Error(`Unresolved host for program ${program.id}: ${program.host}`);
  }
  for (const connection of deployment.connections) {
    fields(connection, ['id', 'name', 'from', 'to', 'transport', 'application'], ['id', 'name', 'from', 'to'], `deployment.connection.${connection.id}`);
    nonEmpty(connection.name, `deployment.connection.${connection.id}.name`);
    if (!endpointIds.has(connection.from) || !endpointIds.has(connection.to) || connection.from === connection.to) {
      throw new Error(`Invalid deployment connection: ${connection.id}`);
    }
    if ('transport' in connection && !['tcp', 'udp'].includes(connection.transport)) throw new Error(`Invalid connection transport: ${connection.id}`);
    if ('application' in connection) nonEmpty(connection.application, `deployment.connection.${connection.id}.application`);
    const label = [connection.name, connection.application, connection.transport].filter(Boolean).join(' · ');
    lines.push(`${reference(endpointNodes.get(connection.from))} -> ${reference(endpointNodes.get(connection.to))}: ${quote(label)}`);
    targets.add(`deployment.connection.${connection.id}`);
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
    deployment: validateRoot(loadYaml(options.source, 'deployment'), 'deployment'),
  };
  const targets = new Set();
  const d2 = {
    context: contextD2(models.context, targets),
    pulse: pulseD2(models.pulse, targets),
    ui: uiD2(models.ui, targets),
    deployment: deploymentD2(models.deployment, targets),
  };
  const requirements = validateRequirements(loadYaml(options.source, 'requirements'), targets);
  if (options.validateOnly) {
    console.log(`Validated Context, Pulse, UI, Deployment, and ${Object.keys(requirements).length} requirement targets.`);
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
    sources: Object.fromEntries(['context', 'pulse', 'ui', 'deployment', 'requirements'].map(name => [
      `${name}.yaml`,
      fs.readFileSync(path.join(options.source, `${name}.yaml`), 'utf8'),
    ])),
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
