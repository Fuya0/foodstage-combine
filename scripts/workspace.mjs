import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const apps = ['food-street', 'jiaoguang', 'xlsk'];
export function tool(app, packageName, relative) {
  const require = createRequire(path.join(root, 'apps', app, 'package.json'));
  return path.join(path.dirname(require.resolve(`${packageName}/package.json`)), relative);
}
export function run(app, executable, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executable, ...args], {
      cwd: path.join(root, 'apps', app), stdio: 'inherit', shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${app} exited ${code ?? signal}`)));
  });
}
