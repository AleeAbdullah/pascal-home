#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'));
const variants = read('variants.json');
const resolve = name => {
  const entry = variants.find(v => v.name === name);
  if (!entry) throw Error(`Unknown variant: ${name}`);
  return entry;
};
const keys = value => Object.keys(value ?? {}).sort();
function compare(a, b) {
  return {
    added: keys(b).filter(id => !Object.hasOwn(a, id)),
    removed: keys(a).filter(id => !Object.hasOwn(b, id)),
    changed: keys(a).filter(id => Object.hasOwn(b, id) && !isDeepStrictEqual(a[id], b[id])),
  };
}

function patch(a, b) {
  const delta = compare(a, b);
  return {
    added: Object.fromEntries(delta.added.map(id => [id, b[id]])),
    removed: delta.removed,
    changed: Object.fromEntries(delta.changed.map(id => [id, b[id]])),
  };
}
function apply(target, delta) {
  for (const id of delta.removed) delete target[id];
  for (const [id, value] of Object.entries({...delta.added, ...delta.changed})) {
    Object.defineProperty(target, id, {value, enumerable: true, writable: true, configurable: true});
  }
}

try {
  const [command, a, b, flag] = process.argv.slice(2);
  if (command === 'list' && !a) {
    const rows = [['NAME', 'KIND', 'PARENT', 'SCENE ID'], ...variants.map(v => [v.name, v.kind, v.parent ?? '-', v.sceneId])];
    const widths = rows[0].map((_, i) => Math.max(...rows.map(row => row[i].length)));
    for (const row of rows) console.log(row.map((value, i) => i === 3 ? value : value.padEnd(widths[i])).join(' '));
    for (const v of variants) {
      if (!fs.existsSync(path.resolve(root, v.file))) {
        console.error(`Missing file: ${v.file}`);
        process.exitCode = 1;
      }
    }
    for (const file of fs.readdirSync(path.join(root, 'scenes')).filter(f => f.endsWith('.json')).sort()) {
      if (!variants.some(v => v.file === `scenes/${file}`)) {
        console.error(`Unlisted snapshot: scenes/${file}`);
        process.exitCode = 1;
      }
    }
  } else if (command === 'load' && a && !b) {
    const v = resolve(a);
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/import-scene.mjs'), v.sceneId, v.file], {stdio: 'inherit', cwd: root});
    if (result.error) throw result.error;
    if (result.signal) throw Error(`Import terminated by ${result.signal}`);
    process.exitCode = result.status ?? 1;
  } else if (command === 'apply' && a && b && (!flag || flag === '--out') && process.argv.length === (flag ? 7 : 5)) {
    const graph = read(variants.find(v => v.name === a)?.file ?? a);
    const delta = read(b);
    apply(graph.nodes, {...delta.nodes, changed: {}});
    for (const [id, fields] of Object.entries(delta.nodes.changed)) {
      apply(graph.nodes[id], {added: {}, removed: delta.removedFields[id] ?? [], changed: fields});
    }
    apply(graph, delta.graph);
    const output = JSON.stringify(graph, null, 2) + '\n';
    if (flag) fs.writeFileSync(path.resolve(root, process.argv[6]), output);
    else process.stdout.write(output);
  } else if (command === 'diff' && a && b && (!flag || flag === '--json') && process.argv.length <= 6) {
    const before = read(resolve(a).file);
    const after = read(resolve(b).file);
    const nodes = compare(before.nodes, after.nodes);
    const counts = {};
    for (const action of ['added', 'removed', 'changed']) {
      counts[action] = {};
      for (const id of nodes[action]) {
        const type = (action === 'removed' ? before : after).nodes[id].type ?? 'unknown';
        counts[action][type] = (counts[action][type] ?? 0) + 1;
      }
    }
    const fields = {};
    for (const id of nodes.changed) {
      fields[id] = [...new Set([...keys(before.nodes[id]), ...keys(after.nodes[id])])].sort()
        .filter(key => !isDeepStrictEqual(before.nodes[id][key], after.nodes[id][key]));
    }
    const materials = compare(before.materials ?? {}, after.materials ?? {});
    const graphFields = [...new Set([...keys(before), ...keys(after)])].sort()
      .filter(key => key !== 'nodes' && key !== 'materials' && !isDeepStrictEqual(before[key], after[key]));
    const nodePatch = patch(before.nodes, after.nodes);
    const removedFields = {};
    for (const id of nodes.changed) {
      const removed = keys(before.nodes[id]).filter(key => !Object.hasOwn(after.nodes[id], key));
      if (removed.length) removedFields[id] = removed;
      nodePatch.changed[id] = Object.fromEntries(fields[id].filter(key => Object.hasOwn(after.nodes[id], key)).map(key => [key, after.nodes[id][key]]));
    }
    const {nodes: beforeNodes, ...beforeGraph} = before;
    const {nodes: afterNodes, ...afterGraph} = after;
    const result = {nodes: nodePatch, removedFields, graph: patch(beforeGraph, afterGraph)};
    if (flag === '--json') console.log(JSON.stringify(result, null, 2));
    else {
      for (const action of ['added', 'removed', 'changed']) console.log(`${action}: ${nodes[action].length} nodes ${JSON.stringify(counts[action])}`);
      console.log(`Materials: ${JSON.stringify(materials)}`);
      console.log(`Other graph fields: ${graphFields.join(', ') || 'none'}`);
    }
  } else throw Error('Usage: variant.mjs list | load <name> | diff <a> <b> [--json] | apply <base> <patch.json> [--out file]');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
