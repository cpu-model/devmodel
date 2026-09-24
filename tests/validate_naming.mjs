import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const processDirectory = fs.existsSync(path.join(root, 'CPU', 'PROCESS')) ? 'CPU/PROCESS' : 'PROCESS';
const files = [
  'README.md',
  'SPEC.md',
  'AGENTS.md',
  `${processDirectory}/CPU-Artifact-Formats-v1.md`,
  `${processDirectory}/CPU-Visual-Language-v1.md`,
];
const documents = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const combined = [...documents.values()].join('\n');

function repositoryFiles(directory, prefix = '') {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (['.git', 'node_modules', 'tmp', 'output'].includes(entry.name)) return [];
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory()
      ? repositoryFiles(path.join(directory, entry.name), relative)
      : [relative];
  });
}

const forbidden = new Map([
  ['top-level Context-Pulse-View triplet', /Context\s*[-–—,]\s*Pulse\s*[-–—,]?\s*(?:and\s+)?View/],
  ['legacy source filename', /\bview\.yaml\b/],
  ['legacy generated filename', /\bview\.(?:d2|svg|png)\b/],
  ['legacy requirement namespace', /\bview\.(?:view|action|info)\./],
  ['legacy YAML root', /^view:\s*$/m],
]);

const errors = [];
for (const file of repositoryFiles(root)) {
  if (file.endsWith('.pdf') && !/^examples[\\/]model[\\/](context|pulse|ui|deployment)\.pdf$/.test(file)) errors.push(`PDF document is not allowed: ${file}`);
  if (file.endsWith('.py')) errors.push(`Python source is not allowed: ${file}`);
  if (file.toLowerCase().includes('addendum')) errors.push(`Separate addendum is not allowed: ${file}`);
}
for (const [label, pattern] of forbidden) {
  for (const [file, text] of documents) {
    if (pattern.test(text)) errors.push(`${label} remains in ${file}`);
  }
}
for (const [label, pattern] of [
  ['Context-Pulse-UI name', /Context[-–—, ]+Pulse[-–—, ]+UI/],
  ['UI source filename', /\bui\.yaml\b/],
  ['nested View concept', /\bViews?\b/],
  ['UI requirement namespace', /\bui\.(?:view|action|info)\./],
  ['Deployment source filename', /\bdeployment\.yaml\b/],
  ['Deployment requirement namespace', /\bdeployment\.(?:host|program|service|connection)\./],
]) {
  if (!pattern.test(combined)) errors.push(`${label} is missing`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Validated terminology in ${documents.size} authoritative documents.`);
