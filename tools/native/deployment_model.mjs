import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const {parseDocument} = createRequire(import.meta.url)('yaml');

function mapping(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  return value;
}
function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}
function exactFields(value, allowed, required, label) {
  mapping(value, label);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}
function id(value, label) {
  nonEmpty(value, label);
  if (value.includes('.')) throw new Error(`${label} must not contain a period`);
  return value;
}
function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(filename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${filename}: ${document.errors.map(error => error.message).join('; ')}`);
  return document.toJS({mapAsMap: false});
}

const runtimeFields = ['command', 'working-directory', 'environment', 'ports', 'volumes', 'health-check', 'restart', 'resources'];

function validateEnvironment(environment, label) {
  if (environment === undefined) return new Set();
  exactFields(environment, ['file', 'variables'], [], label);
  if ('file' in environment) nonEmpty(environment.file, `${label}.file`);
  const names = new Set();
  for (const [index, variable] of list(environment.variables || [], `${label}.variables`).entries()) {
    exactFields(variable, ['name', 'required', 'default', 'secret'], ['name'], `${label}.variables[${index}]`);
    nonEmpty(variable.name, `${label}.variables[${index}].name`);
    if (names.has(variable.name)) throw new Error(`Duplicate environment variable: ${variable.name}`);
    if (variable.secret === true && 'default' in variable) throw new Error(`Secret variable ${variable.name} must not define a default value`);
    names.add(variable.name);
  }
  return names;
}

function validateImplementation(unit, label) {
  if (unit.implementation !== undefined) {
    exactFields(unit.implementation, ['language', 'platform'], [], `${label}.implementation`);
    if ('language' in unit.implementation) nonEmpty(unit.implementation.language, `${label}.implementation.language`);
    if ('platform' in unit.implementation) nonEmpty(unit.implementation.platform, `${label}.implementation.platform`);
  }
  if (['web-ui', 'server-with-web-ui'].includes(unit.role) && !unit.implementation?.platform) {
    throw new Error(`${label} requires an explicitly selected web UI platform`);
  }
}

function validatePort(port, label, declaredVariables) {
  exactFields(port, ['id', 'name', 'port', 'host-port', 'transport', 'application', 'exposure'], ['id', 'name', 'port'], label);
  id(port.id, `${label}.id`);
  nonEmpty(port.name, `${label}.name`);
  if (!Number.isInteger(port.port) || port.port < 1 || port.port > 65535) throw new Error(`${label}.port is invalid`);
  if ('transport' in port && !['tcp', 'udp'].includes(port.transport)) throw new Error(`${label}.transport is invalid`);
  if ('application' in port) nonEmpty(port.application, `${label}.application`);
  if ('exposure' in port && !['internal', 'host', 'public'].includes(port.exposure)) throw new Error(`${label}.exposure is invalid`);
  if (typeof port['host-port'] === 'object') {
    exactFields(port['host-port'], ['variable', 'default'], ['variable'], `${label}.host-port`);
    nonEmpty(port['host-port'].variable, `${label}.host-port.variable`);
    if (!declaredVariables.has(port['host-port'].variable)) throw new Error(`${label}.host-port.variable is not declared`);
    if ('default' in port['host-port'] && (!Number.isInteger(port['host-port'].default) || port['host-port'].default < 1 || port['host-port'].default > 65535)) {
      throw new Error(`${label}.host-port.default is invalid`);
    }
  } else if ('host-port' in port && (!Number.isInteger(port['host-port']) || port['host-port'] < 1 || port['host-port'] > 65535)) {
    throw new Error(`${label}.host-port is invalid`);
  }
}

function validateRuntime(unit, label, inheritedVariables, isService = false) {
  const localVariables = validateEnvironment(unit.environment, `${label}.environment`);
  const declaredVariables = new Set([...inheritedVariables, ...localVariables]);
  const portIds = new Set();
  for (const [index, port] of list(unit.ports || [], `${label}.ports`).entries()) {
    validatePort(port, `${label}.ports[${index}]`, declaredVariables);
    if (portIds.has(port.id)) throw new Error(`Duplicate Port ID in ${label}: ${port.id}`);
    portIds.add(port.id);
  }
  if (isService && 'working-directory' in unit) throw new Error(`${label}.working-directory is not allowed`);
  if ('command' in unit) nonEmpty(unit.command, `${label}.command`);
  if ('working-directory' in unit) nonEmpty(unit['working-directory'], `${label}.working-directory`);
  if (['web-ui', 'server-with-web-ui'].includes(unit.role) && !(unit.ports || []).some(port => ['http', 'https'].includes(port.application))) {
    throw new Error(`${label} requires an explicit HTTP or HTTPS port`);
  }
  if (unit['health-check']) {
    const check = unit['health-check'];
    exactFields(check, ['type', 'path', 'port', 'command', 'interval'], ['type'], `${label}.health-check`);
    if (check.type === 'http' && 'command' in check) throw new Error(`${label}.health-check.command is not allowed for HTTP`);
    if (check.type === 'http' && !('path' in check)) throw new Error(`${label}.health-check.path is required for HTTP`);
    if (check.type === 'tcp' && !('port' in check)) throw new Error(`${label}.health-check.port is required for TCP`);
    if (check.type === 'command' && !('command' in check)) throw new Error(`${label}.health-check.command is required`);
  }
  if (unit.resources !== undefined) {
    exactFields(unit.resources, ['cpu', 'memory'], [], `${label}.resources`);
    if (!('cpu' in unit.resources) && !('memory' in unit.resources)) throw new Error(`${label}.resources requires cpu or memory`);
  }
  return declaredVariables;
}

export function loadDeploymentModel(sourceDirectory) {
  const source = parseYaml(path.join(sourceDirectory, 'deployment.yaml'));
  exactFields(source, ['deployment'], ['deployment'], 'deployment.yaml');
  const deployment = mapping(source.deployment, 'deployment');
  exactFields(deployment, ['environment', 'hosts', 'programs', 'connections'], ['hosts', 'programs', 'connections'], 'deployment');
  const hosts = list(deployment.hosts, 'deployment.hosts');
  const programs = list(deployment.programs, 'deployment.programs');
  const connections = list(deployment.connections, 'deployment.connections');
  const hostIds = new Set();
  const programIds = new Set();
  const endpoints = new Set();
  const targets = new Set();
  const deploymentVariables = validateEnvironment(deployment.environment, 'deployment.environment');

  for (const [index, host] of hosts.entries()) {
    exactFields(host, ['id', 'name', 'type', 'os', 'architecture'], ['id', 'name', 'type'], `deployment.hosts[${index}]`);
    id(host.id, `deployment.hosts[${index}].id`);
    nonEmpty(host.name, `deployment.hosts[${index}].name`);
    if (!['machine', 'virtual-machine', 'cloud-host'].includes(host.type)) throw new Error(`Invalid Host type: ${host.type}`);
    if (hostIds.has(host.id)) throw new Error(`Duplicate Host ID: ${host.id}`);
    hostIds.add(host.id);
    targets.add(`deployment.host.${host.id}`);
  }

  for (const [index, program] of programs.entries()) {
    exactFields(program, ['id', 'name', 'host', 'type', 'role', 'implementation', ...runtimeFields, 'services'], ['id', 'name', 'host', 'type'], `deployment.programs[${index}]`);
    id(program.id, `deployment.programs[${index}].id`);
    nonEmpty(program.name, `deployment.programs[${index}].name`);
    if (!hostIds.has(program.host)) throw new Error(`Unknown Host for Program: ${program.id}`);
    if (!['os-process', 'docker-compose', 'managed-service', 'external-service'].includes(program.type)) throw new Error(`Invalid Program type: ${program.type}`);
    if (programIds.has(program.id)) throw new Error(`Duplicate Program ID: ${program.id}`);
    programIds.add(program.id);
    endpoints.add(program.id);
    targets.add(`deployment.program.${program.id}`);
    validateImplementation(program, `deployment.program.${program.id}`);
    const programVariables = validateRuntime(program, `deployment.program.${program.id}`, deploymentVariables);
    for (const port of program.ports || []) {
      endpoints.add(`${program.id}.${port.id}`);
      targets.add(`deployment.program.${program.id}.port.${port.id}`);
    }
    const services = list(program.services || [], `deployment.program.${program.id}.services`);
    if (program.type === 'docker-compose' && !services.length) throw new Error(`Docker Compose program requires services: ${program.id}`);
    if (program.type !== 'docker-compose' && services.length) throw new Error(`Only Docker Compose Programs may contain Services: ${program.id}`);
    const serviceIds = new Set();
    for (const [serviceIndex, service] of services.entries()) {
      exactFields(service, ['id', 'name', 'role', 'implementation', ...runtimeFields.filter(field => field !== 'working-directory')], ['id', 'name'], `deployment.program.${program.id}.services[${serviceIndex}]`);
      id(service.id, `deployment.program.${program.id}.services[${serviceIndex}].id`);
      nonEmpty(service.name, `deployment.program.${program.id}.services[${serviceIndex}].name`);
      if (serviceIds.has(service.id)) throw new Error(`Duplicate Service ID: ${program.id}.${service.id}`);
      serviceIds.add(service.id);
      validateImplementation(service, `deployment.service.${program.id}.${service.id}`);
      validateRuntime(service, `deployment.service.${program.id}.${service.id}`, programVariables, true);
      endpoints.add(`${program.id}.${service.id}`);
      targets.add(`deployment.service.${program.id}.${service.id}`);
      for (const port of service.ports || []) {
        endpoints.add(`${program.id}.${service.id}.${port.id}`);
        targets.add(`deployment.service.${program.id}.${service.id}.port.${port.id}`);
      }
    }
  }

  const connectionIds = new Set();
  for (const [index, connection] of connections.entries()) {
    exactFields(connection, ['id', 'name', 'from', 'to', 'transport', 'application'], ['id', 'name', 'from', 'to'], `deployment.connections[${index}]`);
    id(connection.id, `deployment.connections[${index}].id`);
    nonEmpty(connection.name, `deployment.connections[${index}].name`);
    if (connectionIds.has(connection.id)) throw new Error(`Duplicate Connection ID: ${connection.id}`);
    if (!endpoints.has(connection.from) || !endpoints.has(connection.to) || connection.from === connection.to) throw new Error(`Invalid Connection: ${connection.id}`);
    connectionIds.add(connection.id);
    targets.add(`deployment.connection.${connection.id}`);
  }

  const requirementsSource = parseYaml(path.join(sourceDirectory, 'requirements.yaml'));
  exactFields(requirementsSource, ['requirements'], ['requirements'], 'requirements.yaml');
  const allRequirements = mapping(requirementsSource.requirements, 'requirements');
  const requirements = {};
  for (const [target, values] of Object.entries(allRequirements)) {
    if (!target.startsWith('deployment.')) continue;
    if (!targets.has(target)) throw new Error(`Unknown Deployment requirement target: ${target}`);
    list(values, `requirements.${target}`);
    if (!values.length) throw new Error(`requirements.${target} must not be empty`);
    requirements[target] = values.map((value, index) => nonEmpty(value, `requirements.${target}[${index}]`));
  }
  return {deployment: {...deployment, hosts, programs, connections}, requirements};
}
