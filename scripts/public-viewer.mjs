#!/usr/bin/env node
// Read-only public front door for one Pascal scene.
// Serves the scene's editor page (open Preview to walk through it; Pascal's
// /embed viewer does not draw authored objects, so it is not used) and the
// static files and compiled objects it loads. Editing is ALLOWED for this one
// scene with no password (owner decision 2026-10-25): saves, the live events
// stream, thumbnails and page server actions pass through. Deleting the scene,
// changing its sharing, other scenes, the project list and settings answer 404.
// Put a tunnel (e.g. ngrok) in front of the port.
// Usage: node scripts/public-viewer.mjs [sceneId] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sceneId = process.argv[2] ?? '588-m1-interior-v1';
const port = Number(process.argv[3] ?? process.env.PUBLIC_VIEWER_PORT ?? 61700);
if (!/^[A-Za-z0-9_-]{1,64}$/.test(sceneId)) throw Error('Invalid scene id');

function upstream() {
  const run = JSON.parse(fs.readFileSync(path.join(root, '.pascal/run/editor.json'), 'utf8'));
  return {port: run.port, host: `pascal.localhost:${run.port}`};
}

const page = `/project/${sceneId}`;
const read = ['GET', 'HEAD'], write = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH'];
const api = `/api/scenes/${sceneId}`;
const writable = [
  p => p === page,
  p => p === api,
  p => p === api + '/events',
  p => p === api + '/thumbnail',
];
const allowed = [
  p => p === page,
  p => p.startsWith('/_next/static/') && !p.includes('..'),
  p => /^\/api\/artifacts\/[0-9a-f]{64}$/.test(p),
  p => /^\/icons\/[\w.-]+\.(webp|png|svg)$/.test(p),
  p => /^\/audios\/sfx\/[\w.-]+\.mp3$/.test(p),
  p => ['/pascal-logo-shape.svg', '/pascal-trackpad-navigation.js', '/favicon.ico'].includes(p),
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://viewer');
  const p = decodeURIComponent(url.pathname);
  if (p === '/') { res.writeHead(302, {Location: page}); res.end(); return; }
  const canWrite = writable.some(ok => ok(p));
  if (!(canWrite ? write : read).includes(req.method) || !(canWrite || allowed.some(ok => ok(p)))) {
    res.writeHead(404, {'Content-Type': 'text/plain'}); res.end('Not found'); return;
  }
  let up;
  try { up = upstream(); } catch { res.writeHead(503); res.end('Pascal is not running'); return; }
  const headers = {...req.headers, host: up.host};
  delete headers.cookie; delete headers.authorization;
  // Pascal refuses writes from a foreign Origin; present the tunnel's requests as its own.
  if (headers.origin) headers.origin = `http://${up.host}`;
  if (headers.referer) headers.referer = `http://${up.host}${new URL(headers.referer).pathname}`;
  const proxied = http.request({hostname: '127.0.0.1', port: up.port, path: req.url, method: req.method, headers}, reply => {
    const out = {...reply.headers};
    delete out['set-cookie'];
    res.writeHead(reply.statusCode, out);
    reply.pipe(res);
  });
  proxied.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Pascal is not reachable'); });
  req.on('aborted', () => proxied.destroy());
  req.pipe(proxied);
});
server.on('upgrade', (req, socket) => socket.destroy());
server.listen(port, '127.0.0.1', () => console.log(`Read-only viewer for ${sceneId}: http://127.0.0.1:${port}${page}`));
