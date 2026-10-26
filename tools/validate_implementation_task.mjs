#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadContextModel} from './native/context_model.mjs';
import {loadPulseModel} from './native/pulse_model.mjs';
import {loadUiModel} from './native/ui_model.mjs';
import {loadDeploymentModel} from './native/deployment_model.mjs';
import {loadRequirements} from './native/requirements_model.mjs';
import {loadComponentsModel} from './native/components_model.mjs';
import {loadPresentationModel} from './native/presentation_model.mjs';

const {parseDocument} = createRequire(import.meta.url)('yaml');
const verificationKinds = new Set([
  'project-tests',
  'strict-cpu-validation',
  'architecture-checks',
  'rendered-ui-review',
  'manual-review',
]);

function exactFields(value, allowed, required, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a mapping`);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  const missing = required.filter(key => !(key in value));
  if (unknown.length || missing.length) throw new Error(`${label}: unknown [${unknown}], missing [${missing}]`);
}

function stringList(value, label, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length)) throw new Error(`${label} must be a ${allowEmpty ? '' : 'non-empty '}list`);
  const result = value.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) throw new Error(`${label}[${index}] must be a non-empty string`);
    return item;
  });
  if (new Set(result).size !== result.length) throw new Error(`${label} must not contain duplicates`);
  return result;
}

function repositoryPath(value, label) {
  if (path.isAbsolute(value) || value.includes('\\') || value.split('/').includes('..')) {
    throw new Error(`${label} must be a repository-relative path without parent traversal`);
  }
}

function options(argv) {
  const allowed = new Set(['--task', '--source']);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key) || !value) throw new Error('Usage: validate_implementation_task.mjs --task <task.yaml> --source <model-directory>');
    if (key in values) throw new Error(`Duplicate option: ${key}`);
    values[key] = value;
  }
  if (!values['--task'] || !values['--source']) throw new Error('Usage: validate_implementation_task.mjs --task <task.yaml> --source <model-directory>');
  return {task: path.resolve(values['--task']), source: path.resolve(values['--source'])};
}

export function validateImplementationTask(taskFilename, sourceDirectory) {
  const document = parseDocument(fs.readFileSync(taskFilename, 'utf8'), {strict: true, uniqueKeys: true});
  if (document.errors.length) throw new Error(`${taskFilename}: ${document.errors.map(error => error.message).join('; ')}`);
  const source = document.toJS({mapAsMap: false});
  exactFields(source, ['cpu-implementation-task'], ['cpu-implementation-task'], 'implementation task');
  const task = source['cpu-implementation-task'];
  exactFields(task, ['model-source', 'scope', 'change-boundary', 'verification', 'diagnostic-references'], ['model-source', 'scope', 'change-boundary', 'verification'], 'cpu-implementation-task');
  if (task['model-source'] !== 'current') throw new Error('cpu-implementation-task.model-source must be current');

  exactFields(task.scope, ['requirement-ids', 'complete-model'], [], 'cpu-implementation-task.scope');
  const hasRequirementIDs = 'requirement-ids' in task.scope;
  const hasCompleteModel = 'complete-model' in task.scope;
  if (hasRequirementIDs === hasCompleteModel) throw new Error('cpu-implementation-task.scope must contain exactly one of requirement-ids and complete-model');
  if (hasCompleteModel && task.scope['complete-model'] !== true) throw new Error('cpu-implementation-task.scope.complete-model must be true');
  const selected = hasRequirementIDs ? stringList(task.scope['requirement-ids'], 'cpu-implementation-task.scope.requirement-ids') : [];
  loadContextModel(sourceDirectory);
  const pulse = loadPulseModel(sourceDirectory);
  const ui = loadUiModel(sourceDirectory);
  loadPresentationModel(sourceDirectory, ui.ui);
  loadDeploymentModel(sourceDirectory);
  const requirements = loadRequirements(sourceDirectory);
  loadComponentsModel(sourceDirectory, pulse.pulse, requirements);
  const known = new Set(Object.values(requirements).flat().map(requirement => requirement.id));
  for (const id of selected) if (!known.has(id)) throw new Error(`Unknown current-model requirement ID: ${id}`);

  exactFields(task['change-boundary'], ['include', 'exclude'], ['include', 'exclude'], 'cpu-implementation-task.change-boundary');
  for (const field of ['include', 'exclude']) {
    const values = stringList(task['change-boundary'][field], `cpu-implementation-task.change-boundary.${field}`, field === 'exclude');
    values.forEach((value, index) => repositoryPath(value, `cpu-implementation-task.change-boundary.${field}[${index}]`));
  }

  const verification = stringList(task.verification, 'cpu-implementation-task.verification');
  for (const value of verification) if (!verificationKinds.has(value)) throw new Error(`Unknown verification kind: ${value}`);

  if ('diagnostic-references' in task) {
    const references = stringList(task['diagnostic-references'], 'cpu-implementation-task.diagnostic-references');
    references.forEach((value, index) => repositoryPath(value, `cpu-implementation-task.diagnostic-references[${index}]`));
  }
  return task;
}

try {
  const {task, source} = options(process.argv.slice(2));
  validateImplementationTask(task, source);
  console.log(`Validated CPU implementation task contract: ${task}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
