#!/usr/bin/env node
// Installs pascal-patches/trackpad-navigation.js into the locally installed Pascal web
// runtime so Preview mode and the embed viewer get trackpad-friendly navigation.
//
// The runtime is a prebuilt Next.js bundle under .pascal/runtime/<version>. This script
//   1. copies the navigation module into the runtime's public/ folder, and
//   2. injects one React effect into the chunk that renders Pascal's view-only camera,
//      which dynamically imports that module.
// The original chunk is kept next to it as <chunk>.orig; `--restore` puts it back.
// Running it again is safe: it always re-applies from the original.
//
//   node scripts/patch-pascal-viewing.mjs            # apply (also run by scripts/pascal.mjs)
//   node scripts/patch-pascal-viewing.mjs --restore  # undo

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pascalHome = process.env.PASCAL_HOME ?? path.join(root, '.pascal');
const MODULE_SOURCE = path.join(root, 'pascal-patches/trackpad-navigation.js');
const MODULE_PUBLIC_NAME = 'pascal-trackpad-navigation.js';
const MARKER = '/*pascal-trackpad*/';

async function exists(p) {
  return fs.access(p).then(() => true, () => false);
}

async function findRuntimeDirectory() {
  const current = path.join(pascalHome, 'run/current-runtime.json');
  if (await exists(current)) {
    const record = JSON.parse(await fs.readFile(current, 'utf8'));
    if (record.directory && (await exists(record.directory))) return record.directory;
  }
  const runtimes = path.join(pascalHome, 'runtime');
  if (!(await exists(runtimes))) return null;
  const versions = (await fs.readdir(runtimes)).filter((v) => /^\d+\.\d+\.\d+/.test(v)).sort();
  return versions.length ? path.join(runtimes, versions.at(-1)) : null;
}

// The two camera components that get the patch: Pascal's view-only camera (embed viewer)
// and the editor camera, which also drives Preview mode. Each resolver returns the
// expressions for the component's "selectable" (editing) flag, camera mode and walkthrough flag.
const TARGETS = [
  {
    name: 'viewer camera',
    test: (text) => text.includes('camera-controls:top-view') && /makeDefault:!0,maxDistance:100,/.test(text),
    selectable: (before) => [...before.matchAll(/left:([\w$]+)\?([\w$]+)\.NONE:\2\.ROTATE/g)].at(-1)?.[1],
  },
  {
    name: 'editor camera',
    test: (text) => text.includes('camera-controls:top-view') && /isPreviewMode\)/.test(text) && /makeDefault:!0,maxDistance:[\w$]+\?1500:100,/.test(text),
    selectable: (before) => {
      const preview = [...before.matchAll(/([\w$]+)=\(0,[\w$]+\.U\)\(e=>e\.isPreviewMode\)/g)].at(-1)?.[1];
      return preview && `!${preview}`;
    },
  },
];

async function findCameraChunks(chunksDir) {
  const files = (await fs.readdir(chunksDir)).filter((f) => f.endsWith('.js'));
  const found = new Map();
  for (const file of files) {
    const full = path.join(chunksDir, file);
    const text = await fs.readFile(full, 'utf8');
    if (text.includes(MARKER) && !(await exists(full + '.orig'))) throw new Error(`${file} is patched but has no .orig backup`);
    for (const target of TARGETS) {
      if (!target.test(text)) continue;
      if (found.has(target.name)) throw new Error(`More than one chunk matches the ${target.name}`);
      found.set(target.name, { target, chunk: full });
    }
  }
  for (const target of TARGETS) if (!found.has(target.name)) throw new Error(`No chunk matches the ${target.name}`);
  return [...found.values()];
}

function inject(source, target, moduleUrl) {
  const ret = /return ([\w$]+)\?null:\(0,[\w$]+\.jsx\)\([\w$.]+,\{[^)]*?makeDefault:!0,[^)]*?ref:([\w$]+)[,}]/.exec(source);
  if (!ret) throw new Error(`${target.name}: return statement not found`);
  const walkthrough = ret[1];
  const ref = ret[2];
  const before = source.slice(0, ret.index);
  const react = [...before.matchAll(/\(0,([\w$]+)\.useEffect\)\(/g)].at(-1)?.[1];
  const selectable = target.selectable(before);
  const cameraMode = [...before.matchAll(/"orthographic"===([\w$]+)\?[\w$.]+\.ZOOM/g)].at(-1)?.[1];
  if (!react || !selectable || !cameraMode) throw new Error(`${target.name}: component variables not found`);
  // Injected identifiers are prefixed with $pt so they cannot shadow the component's minified names.
  const effect =
    `(0,${react}.useEffect)(()=>{let $ptOff,$ptGone=!1;import(${JSON.stringify(moduleUrl)}).then($pt=>{$ptGone||($ptOff=$pt.attach(${ref},{selectable:${selectable},cameraMode:${cameraMode},walkthrough:${walkthrough}}))}).catch($ptErr=>console.warn("Pascal trackpad navigation failed",$ptErr));return()=>{$ptGone=!0,$ptOff?.()}},[${selectable},${cameraMode},${walkthrough}]);${MARKER}`;
  return before + effect + source.slice(ret.index);
}

export async function patchPascalViewing({ restore = false, log = console.log } = {}) {
  const runtime = await findRuntimeDirectory();
  if (!runtime) {
    log('Pascal viewing patch: no installed runtime yet, nothing to do.');
    return false;
  }
  const editor = path.join(runtime, 'apps/editor');
  const chunks = await findCameraChunks(path.join(editor, '.next/static/chunks'));
  const publicModule = path.join(editor, 'public', MODULE_PUBLIC_NAME);

  if (restore) {
    for (const { chunk } of chunks) {
      if (!(await exists(chunk + '.orig'))) continue;
      await fs.copyFile(chunk + '.orig', chunk);
      await fs.rm(chunk + '.orig');
    }
    await fs.rm(publicModule, { force: true });
    log('Pascal viewing patch removed.');
    return true;
  }

  const module = await fs.readFile(MODULE_SOURCE, 'utf8');
  const version = createHash('sha256').update(module).digest('hex').slice(0, 10);
  const moduleUrl = `/${MODULE_PUBLIC_NAME}?v=${version}`;
  const moduleIsNew = !(await exists(publicModule));
  await fs.writeFile(publicModule, module);
  let changed = false;
  for (const { target, chunk } of chunks) {
    const orig = chunk + '.orig';
    const current = await fs.readFile(chunk, 'utf8');
    if (!(await exists(orig))) {
      if (current.includes(MARKER)) throw new Error(`${target.name}: chunk already patched but backup is missing`);
      await fs.writeFile(orig, current);
    }
    const patched = inject(await fs.readFile(orig, 'utf8'), target, moduleUrl);
    if (patched === current) continue;
    await fs.writeFile(chunk, patched);
    changed = true;
    log(`Pascal viewing patch applied to the ${target.name} (${path.relative(root, chunk)}).`);
  }
  if (changed) log(`Module ${version} installed. Hard-reload open Pascal tabs once${moduleIsNew ? ', and restart Pascal if it is already running' : ''}.`);
  else log(`Pascal viewing patch already current (module ${version}).`);
  return changed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  patchPascalViewing({ restore: process.argv.includes('--restore') }).catch((error) => {
    console.error(`Pascal viewing patch failed: ${error.message}`);
    process.exitCode = 1;
  });
}
