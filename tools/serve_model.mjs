#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

function parseArgs(argv) {
  const options = {directory: path.resolve('output/model'), port: 0};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--dir') options.directory = path.resolve(argv[++index]);
    else if (argv[index] === '--port') options.port = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  return options;
}

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.d2', 'text/plain; charset=utf-8'],
]);

const options = parseArgs(process.argv.slice(2));
const index = path.join(options.directory, 'index.html');
if (!fs.existsSync(index)) throw new Error(`Review page not found: ${index}`);

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(options.directory, relative);
  if (candidate !== options.directory && !candidate.startsWith(options.directory + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(candidate, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Read error');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types.get(path.extname(candidate)) || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
  });
});

server.listen(options.port, '127.0.0.1', () => {
  const address = server.address();
  console.log(`CPU_REVIEW_URL=http://127.0.0.1:${address.port}/index.html`);
  console.log('Keep this process running while the model is under review.');
});
