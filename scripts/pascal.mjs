import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(process.execPath, [
  path.join(root, 'node_modules/@pascal-app/cli/dist/bin/pascal.js'),
  ...process.argv.slice(2),
], {
  cwd: root,
  env: { ...process.env, PASCAL_HOME: path.join(root, '.pascal'), PASCAL_SERVER_SCRIPT_COMPILE: '1' },
  stdio: 'inherit',
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
