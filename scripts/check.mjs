import { apps, run, tool } from './workspace.mjs';
const mode = process.argv[2];
if (!['test', 'typecheck'].includes(mode)) throw new Error('Expected test or typecheck');
for (const app of apps) {
  console.log(`${app}: ${mode}`);
  if (mode === 'test') await run(app, tool(app, 'vitest', 'vitest.mjs'), app === 'jiaoguang' ? ['run'] : ['run', '--dir', 'src']);
  else await run(app, tool(app, 'typescript', 'bin/tsc'), ['--noEmit']);
}
