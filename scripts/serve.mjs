import http from 'node:http';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './workspace.mjs';

const argument = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const port = Number(argument('--port') || process.env.PORT || 5196);
const host = argument('--host') || '127.0.0.1';
const directory = path.join(root, 'dist');
const mount = (argument('--mount') || '').replace(/\/+$/, '');
if (mount && !/^\/[^?#]*$/.test(mount)) throw new Error('Mount must be an absolute path');
if (!fs.existsSync(path.join(directory, 'index.html'))) throw new Error('Run npm run build first');
const validators = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const server = http.createServer((request, response) => {
  let url, filename;
  try {
    url = new URL(request.url, 'http://localhost');
    if (mount && url.pathname === mount) { response.writeHead(308, { Location: `${mount}/${url.search}` }).end(); return; }
    if (mount && !url.pathname.startsWith(`${mount}/`)) { response.writeHead(404).end(); return; }
    filename = path.resolve(directory, `.${decodeURIComponent(url.pathname.slice(mount.length))}`);
  } catch { response.writeHead(400).end(); return; }
  if (filename !== directory && !filename.startsWith(`${directory}${path.sep}`)) { response.writeHead(403).end(); return; }
  try {
    const canonical = fs.realpathSync(filename);
    if (canonical !== directory && !canonical.startsWith(`${directory}${path.sep}`)) { response.writeHead(403).end(); return; }
    if (fs.statSync(filename).isDirectory()) {
      if (!url.pathname.endsWith('/')) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }).end(); return; }
      filename = path.join(filename, 'index.html');
    }
    const stat = fs.statSync(filename);
    if (!stat.isFile()) { response.writeHead(404).end(); return; }
    const key = `${stat.size}:${stat.mtimeMs}`;
    let validator = validators.get(filename);
    if (!validator || validator.key !== key) {
      validator = { key, etag: `"${createHash('sha256').update(fs.readFileSync(filename)).digest('hex')}"` };
      validators.set(filename, validator);
    }
    const immutable = /[\\/]assets[\\/][^\\/]+-[a-zA-Z0-9_-]{8,}\.(?:js|css)$/.test(filename);
    const headers = { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', ETag: validator.etag };
    if (request.headers['if-none-match'] === validator.etag) { response.writeHead(304, headers).end(); return; }
    response.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(filename).pipe(response);
  } catch { response.writeHead(404).end(); }
});
server.listen(port, host, () => console.log(`FoodStage Combine: http://${host}:${port}/`));
