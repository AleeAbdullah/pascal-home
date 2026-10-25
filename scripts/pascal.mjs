import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { patchPascalViewing } from './patch-pascal-viewing.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const env = { ...process.env, PASCAL_HOME: path.join(root, '.pascal'), PASCAL_SERVER_SCRIPT_COMPILE: '1' };
// Commands that may install or switch the web runtime, after which the viewing patch must be re-applied.
const runtimeCommands = new Set(['editor', 'start', 'restart', 'resume', 'update', 'open']);

async function applyViewingPatch() {
  try {
    await patchPascalViewing({ log: (m) => console.error(m) });
  } catch (error) {
    console.error(`Pascal viewing patch skipped: ${error.message}`);
  }
}

if (runtimeCommands.has(args[0])) await applyViewingPatch();

const child = spawn(process.execPath, [
  path.join(root, 'node_modules/@pascal-app/cli/dist/bin/pascal.js'),
  ...args,
], { cwd: root, env, stdio: 'inherit' });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', async (code) => {
  if (runtimeCommands.has(args[0])) await applyViewingPatch();
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
