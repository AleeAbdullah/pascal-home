#!/usr/bin/env node
// Convert a Pascal scene into a SketchUp build: exports/sketchup/{build.rb,data.json,furniture.bin}.
// In SketchUp's Ruby Console: load 'C:/…/exports/sketchup/build.rb'
// Usage: node scripts/export-sketchup.mjs [sceneId] [outDir]
// Pascal is Y-up metres; SketchUp is Z-up inches: three (x,y,z) -> SketchUp (x,-z,y), no mirroring.
// Rules below were read from pascalorg/editor @ 9ea725d (core wall/slab/stair/ceiling systems, viewer renderers).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const id = process.argv[2] ?? '588-m1-interior-v1';
const outDir = path.resolve(root, process.argv[3] ?? 'exports/sketchup');
const K = 1 / 0.0254, EPS = 1e-6;
const die = m => { throw Error(`sketchup export: ${m}`) };

// Library material refs are not stored in a scene; colours from the editor's material library
// (.pascal/runtime/1.0.6/apps/editor/.next/static/chunks, previewColor / opacity).
const LIBRARY = {
  'preset-greige': ['#c8c1b8', 1], 'preset-glass': ['#87ceeb', 0.3], 'preset-beige': ['#d9c7ad', 1],
  'preset-softwhite': ['#ebe7df', 1], 'preset-cream': ['#efe3cc', 1],
  'metal-steel': ['#636363', 1], 'wood-squareparquet21': ['#3f220f', 1],
};
const GLASS = ['#87ceeb', 0.3], WALL_DEFAULT = '#e8e4dc';

// ---------- math ----------
const I4 = () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul = (a, b) => a.map((_, i) => b[0].map((_, j) => a[i].reduce((s, _, k) => s + a[i][k] * b[k][j], 0)));
const trans = (x, y, z) => { const m = I4(); m[0][3] = x; m[1][3] = y; m[2][3] = z; return m };
const rotY = t => { const c = Math.cos(t), s = Math.sin(t); return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]] };
const rotX = t => { const c = Math.cos(t), s = Math.sin(t); return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]] };
const rotZ = t => { const c = Math.cos(t), s = Math.sin(t); return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] };
const scale = (x, y, z) => [[x, 0, 0, 0], [0, y, 0, 0], [0, 0, z, 0], [0, 0, 0, 1]];
const eulerXYZ = ([x, y, z]) => mul(rotX(x), mul(rotY(y), rotZ(z))); // three.js default order
const ap = (m, [x, y, z]) => [0, 1, 2].map(i => m[i][0] * x + m[i][1] * y + m[i][2] * z + m[i][3]);
const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const AX = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], AXI = [[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]];
const su = ([x, y, z]) => [x * K, -z * K, y * K]; // three metres -> SketchUp inches
const r4 = v => Math.round(v * 1e4) / 1e4;
const sr = p => su(p).map(r4);
// column-major 16 for SketchUp: rotation part from A·M·A⁻¹, translation in inches
const suXform = m => { const f = mul(AX, mul(m, AXI)); return [0, 1, 2, 3].flatMap(c => [0, 1, 2].map(r => r4(c < 3 ? f[r][c] : f[r][3] * K)).concat(c < 3 ? [0] : [1])) };
const pip = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [a, b] = poly[i], [p, q] = poly[j]; if (b > z !== q > z && x < (p - a) * (z - b) / (q - b) + a) c = !c } return c };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz) };
const polyDist = (x, z, poly) => Math.min(...poly.map((p, i) => segDist(x, z, p, poly[(i + 1) % poly.length])));
const dedupe = pts => pts.filter((p, i) => { const q = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-3 });

// ---------- scene ----------
const scenePath = path.join(root, 'scenes', `${id}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const N = scene.nodes;
const all = Object.values(N);
const of = (type, parent) => all.filter(n => n.type === type && (parent === undefined || n.parentId === parent) && n.visible !== false);
const building = of('building')[0] ?? die('no building');
const levels = of('level').sort((a, b) => a.level - b.level);
const B = mul(trans(...building.position ?? [0, 0, 0]), eulerXYZ(building.rotation ?? [0, 0, 0]));

// Levels stack by cumulative `height` (baseElevation 0); building position lifts the whole stack (core/services/storey.ts).
let acc = 0;
for (const l of levels) { l.baseY = acc + (l.baseElevation ?? 0); acc = l.baseY + (l.height ?? 2.5) }

// ---------- materials ----------
const materials = [], matIdx = new Map();
const hex2rgb = h => /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : die(`bad colour ${h}`);
const addMat = (rgb, alpha, name) => {
  const key = `${rgb}|${alpha}`;
  if (!matIdx.has(key)) { matIdx.set(key, materials.length); materials.push({name: `${name ?? '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')}${alpha < 1 ? ` α${alpha}` : ''}`, rgb, alpha}) }
  return matIdx.get(key);
};
const resolveRef = (ref, ctx) => {
  if (/^#[0-9a-f]{6}$/i.test(ref)) return {rgb: hex2rgb(ref), alpha: 1, name: ref};
  const m = /^(scene|library):(.+)$/.exec(ref ?? '') ?? die(`unresolvable material ref ${ref} (${ctx})`);
  if (m[1] === 'scene') {
    const p = scene.materials?.[m[2]]?.material?.properties ?? die(`scene material ${m[2]} missing (${ctx})`);
    return {rgb: hex2rgb(p.color), alpha: p.opacity ?? 1, name: scene.materials[m[2]].name ?? p.color};
  }
  const l = LIBRARY[m[2]] ?? die(`library material ${m[2]} has no known colour (${ctx})`);
  return {rgb: hex2rgb(l[0]), alpha: l[1], name: m[2]};
};
const matOf = (ref, ctx) => { const r = resolveRef(ref, ctx); return addMat(r.rgb, r.alpha, r.name) };
const matHex = (h, a = 1) => addMat(hex2rgb(h), a);

for (const n of all) for (const [slot, ref] of Object.entries(n.slots ?? {})) resolveRef(ref, `${n.name} slot ${slot}`); // every material ref must resolve, used or not

// ---------- walls: miter port (core/systems/wall/wall-mitering.ts, straight unjustified walls) ----------
const TOL = 0.001, MITER_LIMIT = 10;
const key = p => `${Math.round(p[0] / TOL)},${Math.round(p[1] / TOL)}`;
const faceOff = w => { const t = w.thickness ?? 0.1; return {a: t / 2, b: -t / 2} };
const lineOf = (p, v) => ({a: -v[1], b: v[0], c: -(-v[1] * p[0] + v[0] * p[1])});
function onSegment(p, w) {
  if (key(p) === key(w.start) || key(p) === key(w.end)) return false;
  const v = [w.end[0] - w.start[0], w.end[1] - w.start[1]], L = Math.hypot(...v);
  if (L < 1e-9) return false;
  const t = (v[0] * (p[0] - w.start[0]) + v[1] * (p[1] - w.start[1])) / (L * L);
  return t >= TOL && t <= 1 - TOL && Math.hypot(p[0] - w.start[0] - t * v[0], p[1] - w.start[1] - t * v[1]) < TOL;
}
function miters(walls) {
  const J = new Map();
  for (const w of walls) for (const [end, p] of [['start', w.start], ['end', w.end]]) { const k = key(p); if (!J.has(k)) J.set(k, {p, cw: []}); J.get(k).cw.push({w, end}) }
  for (const j of J.values()) for (const w of walls) if (!j.cw.some(c => c.w === w) && onSegment(j.p, w)) j.cw.push({w, end: 'pass'});
  const out = new Map();
  for (const [k, j] of J) {
    if (j.cw.length < 2) continue;
    const pw = [];
    for (const {w, end} of j.cw) {
      const f = faceOff(w), halfT = Math.max(f.a, -f.b), d = [w.end[0] - w.start[0], w.end[1] - w.start[1]];
      const vs = end === 'pass' ? [d, [-d[0], -d[1]]] : [end === 'start' ? d : [-d[0], -d[1]]];
      for (const [i, v] of vs.entries()) {
        const L = Math.hypot(...v); if (L < 1e-9) continue;
        const nu = [-v[1] / L, v[0] / L], first = end === 'pass' ? i === 0 : end === 'start';
        const a = first ? f.a : -f.b, b = first ? f.b : -f.a;
        pw.push({id: w.id, ang: Math.atan2(v[1], v[0]), eA: lineOf([j.p[0] + nu[0] * a, j.p[1] + nu[1] * a], v), eB: lineOf([j.p[0] - nu[0] * -b, j.p[1] - nu[1] * -b], v), pass: end === 'pass', halfT});
      }
    }
    pw.sort((x, y) => x.ang - y.ang || (x.id < y.id ? -1 : 1));
    const e = new Map();
    for (let i = 0; i < pw.length && pw.length >= 2; i++) {
      const w1 = pw[i], w2 = pw[(i + 1) % pw.length], det = w1.eA.a * w2.eB.b - w2.eB.a * w1.eA.b;
      if (Math.abs(det) < 1e-9) continue;
      const p = [(w1.eA.b * w2.eB.c - w2.eB.b * w1.eA.c) / det, (w2.eB.a * w1.eA.c - w1.eA.a * w2.eB.c) / det];
      const lim = MITER_LIMIT * Math.max(w1.halfT, w2.halfT);
      if (!p.every(Number.isFinite) || (p[0] - j.p[0]) ** 2 + (p[1] - j.p[1]) ** 2 > lim * lim) continue;
      if (!w1.pass) (e.get(w1.id) ?? e.set(w1.id, {}).get(w1.id)).left = p;
      if (!w2.pass) (e.get(w2.id) ?? e.set(w2.id, {}).get(w2.id)).right = p;
    }
    out.set(k, e);
  }
  return out;
}
// plan x-extent of the a (left) and b (right) face at each end, measured along the wall from `start`
function wallExtents(w, M) {
  const {a, b} = faceOff(w), d = [w.end[0] - w.start[0], w.end[1] - w.start[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const pt = (p, o) => [p[0] + n[0] * o, p[1] + n[1] * o];
  const sj = M.get(key(w.start))?.get(w.id), ej = M.get(key(w.end))?.get(w.id);
  const sL = sj?.left ?? pt(w.start, a), sR = sj?.right ?? pt(w.start, b), eL = ej?.right ?? pt(w.end, a), eR = ej?.left ?? pt(w.end, b);
  const al = p => (p[0] - w.start[0]) * u[0] + (p[1] - w.start[1]) * u[1];
  return {L, u, n, xa: [al(sL), al(eL)], xb: [al(sR), al(eR)]};
}

// ---------- supports ----------
const slabsOn = new Map(levels.map(l => [l.id, of('slab', l.id)]));
const covers = (s, x, z, tol = 0) => (pip(x, z, s.polygon) || (tol > 0 && polyDist(x, z, s.polygon) <= tol)) && !(s.holes ?? []).some(h => h.length >= 3 && pip(x, z, h));
// Wall base (core/systems/slab/slab-support.ts): per stretch of wall the lower of the highest slab under each face line (or the
// centre line when no face is covered); elected = highest elevation carrying at least half the wall, else the best-covered one;
// the wall fills down to the lowest stretch. shortcut: raw slab polygons grown by SNAP instead of Pascal's render snapping to wall faces.
const SNAP = 0.04;
function wallSupport(w, lvl) {
  const slabs = slabsOn.get(lvl.id).filter(s => s.support !== 'open' && s.polygon.length >= 3), t = w.thickness ?? 0.1;
  const d = [w.end[0] - w.start[0], w.end[1] - w.start[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]], step = 0.05, cnt = Math.max(2, Math.ceil(L / step));
  const at = (i, o) => [w.start[0] + d[0] * (i + 0.5) / cnt + n[0] * o, w.start[1] + d[1] * (i + 0.5) / cnt + n[1] * o];
  const cov = slabs.map(s => [0, t / 2, -t / 2].map(o => Array.from({length: cnt}, (_, i) => { const [x, z] = at(i, o); return covers(s, x, z, SNAP) })));
  const cand = slabs.filter((s, k) => Math.max(...cov[k].map(c => c.filter(Boolean).length)) * L / cnt >= 0.05);
  const high = (line, i) => Math.max(-Infinity, ...cand.filter(s => cov[slabs.indexOf(s)][line][i]).map(s => s.elevation ?? 0.05));
  const carry = new Map(); let base = Infinity;
  for (let i = 0; i < cnt; i++) {
    const faces = [high(1, i), high(2, i)].filter(Number.isFinite), c = high(0, i);
    const seg = faces.length ? Math.min(...faces) : Math.max(c, 0);
    base = Math.min(base, seg);
    if (faces.length || Number.isFinite(c)) carry.set(+seg.toFixed(4), (carry.get(+seg.toFixed(4)) ?? 0) + 1 / cnt);
  }
  const list = [...carry].sort((p, q) => q[1] - p[1] || q[0] - p[0]), major = list.filter(([, f]) => f >= 0.5 - 1e-6).map(([e]) => e);
  const el = major.length ? Math.max(...major) : list.length ? list[0][0] : 0, off = w.supportOffset ?? 0;
  return {el: el + off, base: Math.min(base, el) + off};
}
// Level top plane: storey height, lowered to the underside of slabs on the level above (core/services/storey.ts)
const above = l => levels[levels.indexOf(l) + 1];
const undersideAt = (l, x, z, tol = 1e-6) => {
  const a = above(l); if (!a) return null;
  const u = slabsOn.get(a.id).filter(s => s.recessed !== true && s.polygon.length >= 3 && covers(s, x, z, tol)).map(s => l.height + (s.elevation ?? 0.05) - (s.thickness ?? 0.05));
  return u.length ? Math.min(...u) : null;
};
const wallTop = (w, l, el) => {
  const follows = w.height == null || (w.supportSlabId !== 'ground' && Math.abs(w.height - l.height) <= EPS);
  if (!follows) return el + w.height;
  let plane = l.height;
  const n = 8; for (let i = 0; i <= n; i++) { const u = undersideAt(l, w.start[0] + (w.end[0] - w.start[0]) * i / n, w.start[1] + (w.end[1] - w.start[1]) * i / n, (w.thickness ?? 0.1) / 2); if (u !== null && u < plane) plane = u }
  return plane;
};
const ceilingY = (c, l) => {
  if (c.height != null) return c.height - 0.01;
  let bound = l.height;
  const cx = c.polygon.reduce((s, p) => s + p[0], 0) / c.polygon.length, cz = c.polygon.reduce((s, p) => s + p[1], 0) / c.polygon.length;
  for (const [x, z] of [...c.polygon, [cx, cz]]) { const u = undersideAt(l, x, z); if (u !== null && u < bound) bound = u }
  return bound - 0.01 - 0.01; // clamp margin, then the renderer draws the surface 1 cm under the stored height
};
// Items, stairs and columns rest on the highest slab their footprint overlaps (viewer floor-elevation-system + core spatial grid)
function footprintCorners([x, , z], [w, , d], ry, inset = 0.01) {
  const hw = Math.max(0, w / 2 - inset), hd = Math.max(0, d / 2 - inset), c = Math.cos(ry), s = Math.sin(ry);
  return [[x + (-hw * c + hd * s), z + (-hw * s - hd * c)], [x + (hw * c + hd * s), z + (hw * s - hd * c)], [x + (hw * c - hd * s), z + (hw * s + hd * c)], [x + (-hw * c - hd * s), z + (-hw * s + hd * c)]];
}
const segX = (a, b, c, d) => { const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]); const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d); return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)) };
const overlaps = (cor, poly) => cor.some(c => pip(c[0], c[1], poly)) || poly.some(p => pip(p[0], p[1], cor)) || cor.some((c, i) => poly.some((p, j) => segX(c, cor[(i + 1) % 4], p, poly[(j + 1) % poly.length])));
function lift(lvl, foots, hostId) {
  const slabs = slabsOn.get(lvl.id), supports = (s, [pos, dim, rot]) => s.polygon.length >= 3 && overlaps(footprintCorners(pos, dim, rot), s.polygon) && !(s.holes ?? []).some(h => h.length >= 3 && pip(pos[0], pos[2], h));
  if (hostId === 'ground') return 0;
  const host = hostId && slabs.find(s => s.id === hostId);
  if (host) for (const f of foots) if (supports(host, f)) return host.elevation ?? 0.05;
  let best = -Infinity;
  for (const f of foots) { const e = Math.max(...slabs.filter(s => supports(s, f)).map(s => s.elevation ?? 0.05), -Infinity); best = Math.max(best, e === -Infinity ? 0 : e) }
  return best === -Infinity ? 0 : best;
}

// ---------- output model ----------
const counts = {walls: 0, openings: 0, slabs: 0, ceilings: 0, stairs: 0, stairSegments: 0, columns: 0, roofSegments: 0, items: 0, skipped: 0};
const solid = (name, mat, outer, push, holes, id) => ({t: 's', id, name, mat, faces: [{outer: dedupe(outer), holes: (holes ?? []).map(dedupe)}], push: push ?? null});
const prism = (name, mat, ring, y0, y1, L, holes, id) => { // plan ring (three x,z) extruded from y0 up to y1, level frame L
  const f = (p, y) => L(p[0], y, p[1]);
  return solid(name, mat, ring.map(p => f(p, y1)), [0, 0, -(y1 - y0) * K], (holes ?? []).map(h => h.map(p => f(p, y1))), id);
};
const levelFrame = l => (x, y, z) => sr(ap(B, [x, y + l.baseY, z]));
const lvlM = l => mul(B, trans(0, l.baseY, 0));

// ---------- build levels ----------
const out = {scene: id, name: '588 M1', units: 'in', materials, site: null, levels: [], artifacts: [], defs: []};
const CATS = ['Walls', 'Floors', 'Ceilings', 'Openings', 'Stairs', 'Columns', 'Roof', 'Furniture'];
const glbCache = new Map(), bin = [], defIdx = new Map();
let binLen = 0, defTris = 0, instTris = 0;

function readGlb(hash) {
  if (glbCache.has(hash)) return glbCache.get(hash);
  const file = path.join(root, 'scenes/artifacts', hash);
  if (!fs.existsSync(file)) die(`artifact ${hash} missing in scenes/artifacts`);
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) die(`artifact ${hash} is not a GLB`);
  let j, bv; for (let o = 12; o < buf.length;) { const len = buf.readUInt32LE(o), ty = buf.readUInt32LE(o + 4), d = buf.subarray(o + 8, o + 8 + len); if (ty === 0x4e4f534a) j = JSON.parse(d.toString('utf8')); else if (ty === 0x004e4942) bv = d; o += 8 + len }
  if (!j || !bv) die(`artifact ${hash} lacks JSON/BIN chunk`);
  const read = i => {
    const a = j.accessors[i]; if (a.sparse) die('sparse accessors unsupported');
    const view = j.bufferViews[a.bufferView], nc = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4}[a.type], sz = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[a.componentType];
    const stride = view.byteStride || nc * sz, base = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), res = new Array(a.count * nc);
    for (let e = 0; e < a.count; e++) for (let c = 0; c < nc; c++) { const o = base + e * stride + c * sz; res[e * nc + c] = a.componentType === 5126 ? bv.readFloatLE(o) : a.componentType === 5125 ? bv.readUInt32LE(o) : a.componentType === 5123 ? bv.readUInt16LE(o) : bv.readUInt8(o) }
    return res;
  };
  const prims = [];
  const walk = (ni, M) => {
    const n = j.nodes[ni];
    const m = n.matrix ? [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => n.matrix[c * 4 + r])) : mul(trans(...(n.translation ?? [0, 0, 0])), mul((([x, y, z, w]) => [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0], [0, 0, 0, 1]])(n.rotation ?? [0, 0, 0, 1]), scale(...(n.scale ?? [1, 1, 1]))));
    const W = mul(M, m);
    if (n.mesh !== undefined) for (const p of j.meshes[n.mesh].primitives) {
      if ((p.mode ?? 4) !== 4) die(`artifact ${hash}: only triangle primitives supported`);
      const pos = read(p.attributes.POSITION), nv = pos.length / 3, idx = p.indices !== undefined ? read(p.indices) : Array.from({length: nv}, (_, i) => i);
      const flip = det3(W) < 0, v = new Float32Array(nv * 3);
      for (let i = 0; i < nv; i++) { const q = su(ap(W, pos.slice(i * 3, i * 3 + 3))); v.set(q, i * 3) }
      const ix = new Uint32Array(idx.length); for (let i = 0; i < idx.length; i += 3) { ix[i] = idx[i]; ix[i + 1] = idx[i + (flip ? 2 : 1)]; ix[i + 2] = idx[i + (flip ? 1 : 2)] }
      const mat = j.materials?.[p.material] ?? {};
      prims.push({v, ix, slot: /^slot_(.+)$/.exec(mat.name ?? '')?.[1] ?? null, color: mat.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1], alpha: mat.alphaMode === 'BLEND' || mat.alphaMode === 'MASK' ? (mat.pbrMetallicRoughness?.baseColorFactor?.[3] ?? 1) : 1});
    }
    for (const c of n.children ?? []) walk(c, W);
  };
  for (const r of j.scenes[j.scene ?? 0].nodes) walk(r, I4());
  const lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30];
  for (const p of prims) for (let i = 0; i < p.v.length; i += 3) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], p.v[i + c]); hi[c] = Math.max(hi[c], p.v[i + c]) }
  const art = {hash, prims: [], bounds: [lo.map(r4), hi.map(r4)]};
  for (const p of prims) { // positions float32 LE then indices uint32 LE; offsets in bytes
    const po = binLen, pb = Buffer.from(p.v.buffer, p.v.byteOffset, p.v.byteLength); bin.push(pb); binLen += pb.length;
    const io = binLen, ib = Buffer.from(p.ix.buffer, p.ix.byteOffset, p.ix.byteLength); bin.push(ib); binLen += ib.length;
    art.prims.push({vc: p.v.length / 3, ic: p.ix.length, po, io});
  }
  const rec = {art, prims, tris: prims.reduce((s, p) => s + p.ix.length / 3, 0), index: out.artifacts.length};
  out.artifacts.push({prims: art.prims, bounds: art.bounds});
  glbCache.set(hash, rec);
  return rec;
}
const srgb = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function furnitureDef(item, ctx) {
  const art = item.source?.artifact ?? die(`item ${item.name} has no compiled artifact`);
  const g = readGlb(art), matIds = g.prims.map(p => {
    const ref = p.slot && item.slots?.[p.slot];
    if (ref) return matOf(ref, `${item.name} slot ${p.slot}`);
    return addMat([0, 1, 2].map(i => Math.round(srgb(p.color[i]) * 255)), r4(p.alpha), p.slot ? `slot ${p.slot}` : 'glb');
  });
  const k = `${art}|${matIds}`;
  if (!defIdx.has(k)) { defIdx.set(k, out.defs.length); out.defs.push({name: `${item.name}`, art: g.index, mats: matIds}); defTris += g.tris }
  instTris += g.tris;
  return defIdx.get(k);
}
for (const it of of('item')) { const a = it.asset ?? {}; if ((a.offset ?? [0, 0, 0]).some(v => v) || (a.rotation ?? [0, 0, 0]).some(v => v) || (a.scale ?? [1, 1, 1]).some(v => v !== 1)) die(`item ${it.name}: asset offset/rotation/scale not supported`) }

// stairs (core/systems/stair: computeSegmentTransforms, resolveStairWinder; viewer stair-system legacy profile)
const rotXZ = (x, z, a) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
function winder(seg) {
  const {innerGap: gap, walkingLineOffset: off, turn, division} = seg.winder, {width, height, stepCount: count} = seg;
  const radius = gap + off, outer = gap + width, sign = turn === 'left' ? -1 : 1;
  const point = (r, a) => { const s = r / Math.max(Math.cos(a), Math.sin(a)); return [sign * (gap + width / 2 - s * Math.cos(a)), s * Math.sin(a)] };
  const stationAngle = s => s <= radius ? Math.atan2(s, radius) : Math.atan2(radius, 2 * radius - s);
  const angles = Array.from({length: count + 1}, (_, i) => division === 'equal-angle' ? i / count * Math.PI / 2 : stationAngle(i / count * 2 * radius));
  const rim = (r, s, e) => [point(r, s), ...(s < Math.PI / 4 && e > Math.PI / 4 ? [point(r, Math.PI / 4)] : []), point(r, e)];
  return {treads: Array.from({length: count}, (_, i) => ({polygon: [...rim(outer, angles[i], angles[i + 1]), ...rim(gap, angles[i], angles[i + 1]).reverse()], elevation: (i + 1) * height / count})), exit: {position: [sign * (gap + width / 2), height, gap + width / 2], rotation: sign * Math.PI / 2}};
}
function segTransforms(segs) {
  const out = []; let x = 0, y = 0, z = 0, r = 0;
  segs.forEach((s, i) => {
    if (i) {
      const p = segs[i - 1]; let ax = 0, az = 0, dr = 0;
      if (p.winder) { const w = winder(p); [ax, az] = [w.exit.position[0], w.exit.position[2]]; dr = w.exit.rotation }
      else if (s.attachmentSide === 'front') { az = p.length }
      else if (s.attachmentSide === 'left') { ax = p.width / 2; az = p.length / 2; dr = Math.PI / 2 }
      else if (s.attachmentSide === 'right') { ax = -p.width / 2; az = p.length / 2; dr = -Math.PI / 2 }
      const [dx, dz] = rotXZ(ax, az, r); x += dx; y += p.height; z += dz; r += dr;
    }
    out.push({pos: [x, y, z], rot: r});
  });
  return out;
}
function stairFootprints(st, segs, tr) {
  if (st.stairType !== 'straight') { const o = (st.innerRadius ?? 0.9) + (st.width ?? 1); return [[st.position, [2 * o, 0.01, 2 * o], 0]] }
  return segs.map((s, i) => { const [cx, cz] = rotXZ(...rotXZ(0, s.length / 2, tr[i].rot).map((v, k) => v + tr[i].pos[k * 2]), st.rotation ?? 0); return [[st.position[0] + cx, st.position[1] + tr[i].pos[1], st.position[2] + cz], [s.width, Math.max(s.height, s.thickness, 0.01), s.length], (st.rotation ?? 0) + tr[i].rot] });
}

for (const lvl of levels) {
  const L = levelFrame(lvl), cats = Object.fromEntries(CATS.map(c => [c, []])), M = lvlM(lvl);
  const slabs = of('slab', lvl.id), walls = of('wall', lvl.id);
  if (walls.some(w => w.justification !== undefined || w.curveOffset)) die('justified or curved walls are not supported');
  const mt = miters(walls);

  for (const w of walls) {
    counts.walls++;
    const sup = wallSupport(w, lvl), top = wallTop(w, lvl, sup.el), y0 = Math.min(sup.base, sup.el), ext = wallExtents(w, mt), t = w.thickness ?? 0.1;
    if (!(top - y0 > EPS) || ext.L < EPS) { counts.skipped++; continue }
    const ops = (w.children ?? []).map(c => N[c]).filter(c => c && (c.type === 'door' || c.type === 'window') && c.visible !== false);
    const rects = ops.map(o => {
      let x0 = o.position[0] - o.width / 2, x1 = o.position[0] + o.width / 2;
      const lo = Math.max(0, ext.xa[0], ext.xb[0]) + 0.01, hi = Math.min(ext.L, ext.xa[1], ext.xb[1]) - 0.01; // keep 1 cm of wall before a mitred end
      if (x0 < -1e-4 || x1 > ext.L + 1e-4) die(`opening ${o.name} does not fit along wall ${w.name}`);
      x0 = Math.max(x0, lo); x1 = Math.min(x1, hi); // shortcut: an opening reaching into a mitred end is trimmed to leave 1 cm of wall; upgrade by cutting the end face too
      const bottom = sup.el + o.position[1] - o.height / 2, topY = sup.el + o.position[1] + o.height / 2;
      const floor = o.position[1] - o.height / 2 <= 0.01, yb = floor ? Math.min(y0, bottom) : bottom;
      if (yb < y0 - 1e-4 || topY > top + 1e-4) die(`opening ${o.name} does not fit in the height of wall ${w.name} (${yb.toFixed(3)}..${topY.toFixed(3)} vs ${y0.toFixed(3)}..${top.toFixed(3)})`);
      return {o, x0, x1, y0: Math.max(y0, yb), y1: Math.min(top, topY), leafY0: Math.max(y0, bottom)};
    }).sort((p, q) => p.x0 - q.x0);
    // openings that stack or abut into one continuous cut (door + panel + transom; window + sliding door + window) are one hole
    const vm = [], same = (a, b) => Math.abs(a - b) < 1e-4;
    for (const r of [...rects].sort((p, q) => p.x0 - q.x0 || p.x1 - q.x1 || p.y0 - q.y0)) {
      const p = vm.find(c => same(c.x0, r.x0) && same(c.x1, r.x1) && r.y0 <= c.y1 + 1e-4);
      if (p) { p.y1 = Math.max(p.y1, r.y1); p.names += ` + ${r.o.name}` } else vm.push({x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, names: r.o.name});
    }
    for (const [i, p] of vm.entries()) for (const r of vm.slice(i + 1)) if (r.x0 < p.x1 - 1e-4 && p.x0 < r.x1 - 1e-4 && r.y0 < p.y1 - 1e-4 && p.y0 < r.y1 - 1e-4) die(`openings ${p.names} and ${r.names} overlap in wall ${w.name}`);
    const cuts = [];
    for (const r of vm.sort((p, q) => p.x0 - q.x0 || p.y0 - q.y0)) {
      const p = cuts.find(c => same(c.x1, r.x0) && same(c.y0, r.y0) && same(c.y1, r.y1));
      if (p) { p.x1 = r.x1; p.names += ` + ${r.names}` } else cuts.push(r);
    }
    const nb = r => r.y0 <= y0 + EPS, nt = r => r.y1 >= top - EPS;
    // pieces between full-height openings
    const full = cuts.filter(r => nb(r) && nt(r)), pieces = []; let cur = Math.max(ext.xa[0], ext.xb[0]);
    const xEnd = Math.min(ext.xa[1], ext.xb[1]);
    for (const f of full) { if (f.x0 > cur + EPS) pieces.push([cur, f.x0]); cur = f.x1 }
    if (xEnd > cur + EPS) pieces.push([cur, xEnd]);
    // face a is the +n side (local +z); elevation face is built on the a plane, then pushed through the thickness toward b
    const A = (x, y) => { const p = [w.start[0] + ext.u[0] * x + ext.n[0] * t / 2, w.start[1] + ext.u[1] * x + ext.n[1] * t / 2]; return L(p[0], y, p[1]) };
    const faces = pieces.map(([px0, px1]) => {
      const rs = cuts.filter(r => !(nb(r) && nt(r)) && r.x0 >= px0 - EPS && r.x1 <= px1 + EPS), pts = [[px0, y0]];
      for (const r of rs.filter(nb)) pts.push([r.x0, y0], [r.x0, r.y1], [r.x1, r.y1], [r.x1, y0]);
      pts.push([px1, y0], [px1, top]);
      for (const r of rs.filter(nt).reverse()) pts.push([r.x1, top], [r.x1, r.y0], [r.x0, r.y0], [r.x0, top]);
      pts.push([px0, top]);
      return {outer: dedupe(pts.map(([x, y]) => A(x, y))), holes: rs.filter(r => !nb(r) && !nt(r)).map(r => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].map(([x, y]) => A(x, y)))};
    });
    const o3 = A(0, 0), uS = su(ap(B, [w.start[0] + ext.u[0], 0, w.start[1] + ext.u[1]])).map((v, i) => v - su(ap(B, [w.start[0], 0, w.start[1]]))[i]), us = Math.hypot(...uS);
    const nS = su(ap(B, [w.start[0] + ext.n[0], 0, w.start[1] + ext.n[1]])).map((v, i) => v - su(ap(B, [w.start[0], 0, w.start[1]]))[i]), ns = Math.hypot(...nS);
    const slots = w.slots ?? {}, mat = f => slots[f] ? matOf(slots[f], `wall ${w.name} slot ${f}`) : matHex(WALL_DEFAULT);
    const ends = [0, 1].map(e => ({x: ext.xa[e] * K, dx: (ext.xb[e] - ext.xa[e]) * K})).filter(e => Math.abs(e.dx) > 1e-3);
    cats.Walls.push({t: 'w', id: w.id, name: w.name, faces, push: nS.map(v => r4(-v / ns * t * K)), na: nS.map(v => r4(v / ns)), o: o3, u: uS.map(v => r4(v / us)), ends, ma: mat('a'), mb: mat('b')});
    for (const r of rects) {
      counts.openings++;
      const o = r.o, thick = o.type === 'door' ? 0.04 : 0.012, wx = r.x0;
      const P = (x, y, za) => { const p = [w.start[0] + ext.u[0] * x + ext.n[0] * za, w.start[1] + ext.u[1] * x + ext.n[1] * za]; return L(p[0], y, p[1]) };
      const yb = o.type === 'door' ? r.leafY0 : r.y0, yt = r.y1;
      const mat2 = o.type === 'door' ? (o.slots?.panel ? matOf(o.slots.panel, `door ${o.name} panel`) : matHex('#b49a7a')) : addMat(hex2rgb(GLASS[0]), GLASS[1], 'glass');
      const ring = [[wx, yb], [r.x1, yb], [r.x1, yt], [wx, yt]].map(([x, y]) => P(x, y, thick / 2));
      const ts = su(ap(B, [ext.n[0], 0, ext.n[1]])).map((v, i) => v - su(ap(B, [0, 0, 0]))[i]), tl = Math.hypot(...ts);
      cats.Openings.push({t: 's', id: o.id, name: o.name, mat: mat2, faces: [{outer: dedupe(ring), holes: []}], push: ts.map(v => r4(-v / tl * thick * K))});
    }
  }

  for (const s of slabs) {
    counts.slabs++;
    const top = s.elevation ?? 0.05, th = s.thickness ?? 0.05, mat = s.slots?.surface ? matOf(s.slots.surface, `slab ${s.name}`) : matHex('#dedbd3');
    let holes = [...(s.holes ?? [])];
    for (const f of of('floor-opening', lvl.id)) if (f.cutsPrimary !== false && f.drawnOn === 'floor' && !holes.some(h => JSON.stringify(h) === JSON.stringify(f.polygon)) && f.polygon.every(p => pip(p[0], p[1], s.polygon)) && !s.holes?.some(h => f.polygon.some(p => pip(p[0], p[1], h)))) holes.push(f.polygon); // shortcut: openings that cross a slab edge are not subtracted, upgrade with a polygon boolean
    if (s.recessed) die(`recessed slab ${s.name} unsupported`);
    cats.Floors.push(prism(s.name, mat, s.polygon, top - th, top, L, holes, s.id));
  }
  for (const c of of('ceiling', lvl.id)) {
    counts.ceilings++;
    const y = ceilingY(c, lvl), mat = c.slots?.surface ? matOf(c.slots.surface, `ceiling ${c.name}`) : matHex('#f4f1ea');
    cats.Ceilings.push(prism(c.name, mat, c.polygon, y - 0.0127, y, L, c.holes ?? [], c.id)); // shortcut: Pascal ceilings are zero-thickness; 12.7 mm slab so the model is solid
  }

  for (const st of of('stair', lvl.id)) {
    counts.stairs++;
    const segs = (st.children ?? []).map(c => N[c]).filter(c => c?.type === 'stair-segment' && c.visible !== false), tr = segTransforms(segs);
    const lf = lift(lvl, stairFootprints(st, segs, tr), st.supportSlabId), Ms = mul(M, mul(trans(st.position[0], st.position[1] + lf, st.position[2]), rotY(st.rotation ?? 0)));
    const T3 = (m, p) => sr(ap(m, p)), mat = matHex('#cfc8bb'), g = [];
    const ring = (m, pts) => pts.map(p => T3(m, p));
    if (st.stairType === 'straight') segs.forEach((s, i) => {
      counts.stairSegments++;
      const Mg = mul(Ms, mul(trans(...tr[i].pos), rotY(tr[i].rot))), th = s.thickness ?? 0.15;
      if (s.winder) {
        winder(s).treads.forEach((p, k) => g.push(solid(`${st.name} · winder ${k + 1}`, mat, ring(Mg, p.polygon.map(([x, z]) => [x, p.elevation, z])), [0, 0, -th * K])));
        return;
      }
      let prof;
      if (s.segmentType === 'landing') prof = [[0, 0], [s.length, 0], [s.length, -th], [0, -th]];
      else {
        const d = s.length / s.stepCount, r = s.height / s.stepCount; prof = [[0, 0]];
        for (let k = 0; k < s.stepCount; k++) prof.push([k * d, (k + 1) * r], [(k + 1) * d, (k + 1) * r]);
        if (s.fillToFloor) prof.push([s.length, -tr[i].pos[1]], [0, -tr[i].pos[1]]);
        else { const vOff = th / Math.cos(Math.atan2(r, d)); prof.push([s.length, s.height - vOff]); if (tr[i].pos[1] === 0) { const xg = s.length - (s.height - vOff) / (r / d); if (xg > 0) prof.push([xg, 0]) } else prof.push([0, -vOff]) }
      }
      g.push(solid(`${st.name} · ${s.segmentType === 'landing' ? 'landing' : 'flight'} ${i + 1}`, mat, ring(Mg, prof.map(([z, y]) => [-s.width / 2, y, z])), (() => { const a = ap(Mg, [0, 0, 0]), b = ap(Mg, [s.width, 0, 0]); return su(b).map((v, k) => v - su(a)[k]).map(r4) })()));
    });
    else { // spiral / curved: one wedge per step (viewer nodes/stair/renderer.tsx CurvedStairBody), no railings
      counts.stairSegments++;
      const inner = Math.max(0.2, st.innerRadius ?? 0.9), outer = inner + Math.max(st.width ?? 1, 0.4), n = Math.max(2, Math.round(st.stepCount ?? 10)), sweep = st.sweepAngle ?? (st.stairType === 'spiral' ? Math.PI * 2 : Math.PI / 2), ss = sweep / n, th = Math.max(st.thickness ?? 0.25, 0.001), rise = st.totalRise / n;
      const wedge = (a0, a1, y) => { const k = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 12))), o = [], i = []; for (let q = 0; q <= k; q++) { const a = a0 + (a1 - a0) * q / k; o.push([Math.cos(a) * outer, y, Math.sin(a) * outer]); i.push([Math.cos(a) * inner, y, Math.sin(a) * inner]) } return ring(Ms, [...o, ...i.reverse()]) };
      for (let k = 0; k < n; k++) g.push(solid(`${st.name} · step ${k + 1}`, mat, wedge(-sweep / 2 + ss * k, -sweep / 2 + ss * (k + 1), rise * (k + 1)), [0, 0, -th * K]));
      if (st.topLandingMode === 'integrated') { const ls = Math.min(Math.PI * 2, Math.max(0.001, st.topLandingDepth ?? 0.9) / (inner + Math.max(st.width ?? 1, 0.4) / 2)) * Math.sign(sweep); g.push(solid(`${st.name} · landing`, mat, wedge(sweep / 2, sweep / 2 + ls, st.totalRise), [0, 0, -th * K])) }
      if (st.stairType === 'spiral' && (st.showCenterColumn ?? true)) { const r = Math.min(inner * 0.72, Math.max(inner - 0.03, inner * 0.5)); g.push(solid(`${st.name} · column`, mat, ring(Ms, Array.from({length: 24}, (_, q) => [Math.cos(q / 24 * 2 * Math.PI) * r, st.totalRise + th, Math.sin(q / 24 * 2 * Math.PI) * r])), [0, 0, -(st.totalRise + th) * K])) }
    }
    cats.Stairs.push({t: 'g', id: st.id, name: st.name, items: g});
  }

  for (const c of of('column', lvl.id)) {
    counts.columns++;
    if (!['square', 'rectangular'].includes(c.crossSection) || c.style !== 'plain') die(`column ${c.name}: only plain rectangular columns supported`);
    const lf = lift(lvl, [[c.position, [c.width, c.height, c.depth], c.rotation ?? 0]], c.supportSlabId), y0 = c.position[1] + lf, Mc = mul(M, mul(trans(c.position[0], y0, c.position[2]), rotY(c.rotation ?? 0)));
    cats.Columns.push(solid(c.name, c.slots?.body ? matOf(c.slots.body, c.name) : matHex('#cfcac0'), [[-c.width / 2, c.height, -c.depth / 2], [c.width / 2, c.height, -c.depth / 2], [c.width / 2, c.height, c.depth / 2], [-c.width / 2, c.height, c.depth / 2]].map(p => sr(ap(Mc, p))), [0, 0, -c.height * K], [], c.id));
  }

  for (const r of of('roof', lvl.id)) {
    const Mr = mul(M, mul(trans(...r.position), rotY(typeof r.rotation === 'number' ? r.rotation : 0)));
    for (const cid of r.children ?? []) {
      const s = N[cid]; if (s?.type !== 'roof-segment' || s.visible === false) continue;
      if (s.roofType !== 'flat') die(`roof segment ${s.name}: only flat roofs supported`);
      counts.roofSegments++;
      const Ms2 = mul(Mr, mul(trans(...s.position), rotY(s.rotation ?? 0))), h = (s.wallHeight ?? 0) + s.deckThickness + s.shingleThickness, w2 = s.width / 2, d2 = s.depth / 2;
      cats.Roof.push(solid(s.name, r.slots?.surface ? matOf(r.slots.surface, s.name) : matHex('#bdb8ae'), [[-w2, h, -d2], [w2, h, -d2], [w2, h, d2], [-w2, h, d2]].map(p => sr(ap(Ms2, p))), [0, 0, -h * K], [], s.id)); // flat: centred on its position, rises deck + shingle from the wall plate
    }
  }

  for (const it of of('item')) {
    const par = N[it.parentId];
    if (par.id !== lvl.id && !(par.type === 'ceiling' && par.parentId === lvl.id)) continue;
    counts.items++;
    const def = furnitureDef(it, lvl.name);
    let Mi;
    const R = mul(eulerXYZ(it.rotation ?? [0, 0, 0]), scale(...(it.scale ?? [1, 1, 1])));
    if (par.type === 'ceiling') Mi = mul(M, mul(trans(0, ceilingY(par, lvl), 0), mul(trans(...it.position), R)));
    else { const lf = it.asset?.attachTo ? 0 : lift(lvl, [[it.position, (it.asset?.dimensions ?? [0, 0, 0]).map((v, i) => v * (it.scale?.[i] ?? 1)), it.rotation?.[1] ?? 0]], it.supportSlabId); Mi = mul(M, mul(trans(it.position[0], it.position[1] + lf, it.position[2]), R)) }
    cats.Furniture.push({t: 'i', id: it.id, name: it.name, def, xf: suXform(Mi)});
  }
  out.levels.push({name: lvl.name, categories: cats});
}

// site: flat ground face at world 0 (site polygon is in plan coordinates)
const site = of('site')[0];
if (site) out.site = {name: 'Site', mat: matHex('#8f9a78'), outer: dedupe(site.polygon.points.map(p => sr([p[0], 0, p[1]])))};

// ---------- write ----------
fs.mkdirSync(outDir, {recursive: true});
out.counts = {...counts, definitions: out.defs.length, instances: counts.items, triangles: defTris, instancedTriangles: instTris};
fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(out));
fs.writeFileSync(path.join(outDir, 'furniture.bin'), Buffer.concat(bin));
fs.copyFileSync(path.join(root, 'scripts/sketchup-builder.rb'), path.join(outDir, 'build.rb'));
const kb = f => `${(fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0)} KB`;
console.log(`SketchUp export ${id} -> ${path.relative(root, outDir)}: data.json ${kb('data.json')}, furniture.bin ${kb('furniture.bin')}, build.rb ${kb('build.rb')}`);
console.log(JSON.stringify(out.counts));
