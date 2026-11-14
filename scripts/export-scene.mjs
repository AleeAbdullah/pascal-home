#!/usr/bin/env node
// Write this machine's saved Pascal scene to scenes/<sceneId>.json and copy the
// compiled objects it uses into scenes/artifacts, ready to commit.
// Usage: node scripts/export-scene.mjs [sceneId] [outFile]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncSceneArtifacts,readSceneGraph} from './sync-scene-artifacts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const id = process.argv[2] ?? '588-m1-interior-v1';
const out = path.resolve(root, process.argv[3] ?? `scenes/${id}.json`);
const graph = readSceneGraph(id,path.join(root, '.pascal/data/pascal.db'));
if (!graph.nodes || !Object.keys(graph.nodes).length) throw Error(`Scene ${id} is empty; not exporting`);
fs.writeFileSync(out, JSON.stringify(graph, null, 2) + '\n');
const a = syncSceneArtifacts(out);
console.log(`Exported ${id}: ${Object.keys(graph.nodes).length} nodes to ${path.relative(root, out)}; artifacts ${a.copied} copied, ${a.missing.length} missing`);
if (a.missing.length) process.exitCode = 1;
