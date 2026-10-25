#!/usr/bin/env node
// Load a committed scene export into this machine's local Pascal.
// Usage: node scripts/import-scene.mjs [sceneId] [file]   (Pascal must be running: npm start)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const id = process.argv[2] ?? '588-m1-interior-v1';
const file = path.resolve(root, process.argv[3] ?? `scenes/${id}.json`);
const graph = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = graph.name ?? '588 M1 · Interior V1 · Warm stone & walnut';

// Compiled object modules the scene references.
const store = path.join(root, '.pascal/data/pascal.db.artifacts');
fs.mkdirSync(store, {recursive: true});
let copied = 0;
for (const h of fs.readdirSync(path.join(root, 'scenes/artifacts'))) {
  const dest = path.join(store, h);
  if (!fs.existsSync(dest)) { fs.copyFileSync(path.join(root, 'scenes/artifacts', h), dest); copied++; }
}

const c = new Client({name: 'import-scene', version: '1'}, {capabilities: {}});
await c.connect(new StdioClientTransport({command: process.execPath, args: [path.join(root, 'scripts/pascal.mjs'), 'mcp', 'connect'], cwd: root}));
const call = async (n, a) => { const r = await c.callTool({name: n, arguments: a}); const v = r.structuredContent ?? JSON.parse(r.content.find(x => x.type === 'text').text); if (r.isError || v.code) throw Error(n + ': ' + JSON.stringify(v).slice(0, 400)); return v; };
try {
  const exists = (await call('list_scenes', {})).scenes?.some?.(s => s.id === id);
  if (!exists) await call('create_project', {id, name});
  await call('load_scene', {id});
  const st = await call('get_project_status', {id});
  await call('save_scene', {id, name, graph, includeCurrentScene: false, replace: true, saveMode: 'checkpoint', expectedVersion: st.version});
  const done = await call('get_project_status', {id});
  console.log(`Imported ${id}: ${done.nodeCount} nodes, ${copied} artifacts copied. Open ${done.editorUrl}`);
} finally { await c.close(); }
