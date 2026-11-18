import fs from 'node:fs/promises';
import path from 'node:path';
import { root, apps, run, tool } from './workspace.mjs';

const stage = path.join(root, '.codex', `build-${Date.now()}`);
await fs.mkdir(stage, { recursive: true });
for (const app of apps) {
  await run(app, tool(app, 'typescript', 'bin/tsc'), ['--noEmit']);
  await run(app, tool(app, 'vite', 'bin/vite.js'), ['build', '--outDir', path.join(stage, app)]);
}
const final = path.join(stage, 'site');
await fs.cp(path.join(stage, 'food-street'), final, { recursive: true });
for (const app of ['jiaoguang', 'xlsk']) await fs.cp(path.join(stage, app), path.join(final, app), { recursive: true });
const dist = path.join(root, 'dist');
await fs.mkdir(dist, { recursive: true });
if ((await fs.lstat(dist)).isSymbolicLink() || await fs.realpath(dist) !== path.join(await fs.realpath(root), 'dist')) {
  throw new Error('Build output must be the real repository dist directory');
}
// Synchronize generated files individually; never recursively delete a computed path.
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Symlink in build output: ${entry.name}`);
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}
const next = new Set(await files(final));
for (const old of await files(dist)) if (!next.has(old)) {
  const target = path.resolve(dist, old);
  if (!target.startsWith(`${dist}${path.sep}`)) throw new Error('Build output escapes dist');
  await fs.unlink(target);
}
await fs.cp(final, dist, { recursive: true, force: true });
console.log(`Combined static site ready: ${dist}`);
