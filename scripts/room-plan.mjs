#!/usr/bin/env node
// Room-plan image generator: model (grey) vs Building Control drawing (red).
//
//   node scripts/room-plan.mjs <room name or zone id> [--level ground|first|second]
//        [--pad 36] [--out path.svg] [--no-pdf]
//
// Read-only on scenes/588-m1-interior-v1.json. Writes an SVG and (unless
// ROOM_PLAN_NO_PNG=1) a 2x PNG next to it, rasterised by scripts/svg2png.swift
// (WebKit; compiled on first use to $ROOM_PLAN_OUT/../svg2png or the path in
// ROOM_PLAN_SVG2PNG). Node 22+, stdlib only. Deterministic: same input, same bytes.
//
// Plan frame: +X right (east), +Z down the page (toward the street). Metres in the
// scene, inches everywhere in this script.
//
// PDF overlay (bc-sheet.json, display points -> model inches, scale 2.43606 in/pt):
//   ground : X=(x-216.27)*2.43606  Z=(y-800.08)*2.43606
//   second : X=(x-1208.61)*2.43606 Z=(y-800.08)*2.43606
//   first  : X=(x-739.19)*2.43606  Z=(y-800.08)*2.43606      <- calibrated here
// First-floor calibration: in the middle plan the west outer wall face is the long
// vertical line at x=735.5 (spanning the plan) and the rear outer face the horizontal
// line at y=796.4 (same line as on the ground plan). Outer face = -9 in => X=0 inner
// face at x=735.5+9/2.43606=739.19; Z=0 at y=796.4+3.69=800.09 (=800.08, identical
// to the ground sheet row). Ground-floor check: outer faces 212.58 / 796.4 give
// origin 216.27 / 800.08 exactly as above.
//
// Door swing convention (hinge side / inward-outward) is inferred from the wall
// front normal and is best read together with the red drawing; see limits in README
// of the report.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCENE = path.resolve(HERE, '../scenes/588-m1-interior-v1.json')
const SCRATCH = '/private/tmp/claude-501/-Users-alee--claude-spares-spare-3mbic2/25218af8-fe26-45ea-bbba-f4c6ec9a3ab4/scratchpad'
const OUT_DIR = process.env.ROOM_PLAN_OUT || path.join(SCRATCH, 'rooms')
const PDF_JSON = process.env.ROOM_PLAN_PDF || path.join(SCRATCH, 'pdf/bc-sheet.json')
const SVG2PNG = process.env.ROOM_PLAN_SVG2PNG || path.join(SCRATCH, 'svg2png')

const LEVELS = { ground: 'level_as4e3a9d57', first: 'level_as4d3a9bc4', second: 'level_as503aa07d' }
const PT = 2.43606 // inches per PDF display point
const PDF_ORIGIN = {
  ground: [216.27, 800.08],
  first: [739.19, 800.08],
  second: [1208.61, 800.08],
}
const M2IN = 1 / 0.0254

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2)
const opt = { pad: 36, pdf: true, level: null, out: null }
const pos = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--level') opt.level = argv[++i]
  else if (a === '--pad') opt.pad = Number(argv[++i])
  else if (a === '--out') opt.out = argv[++i]
  else if (a === '--no-pdf') opt.pdf = false
  else pos.push(a)
}
if (!pos.length) {
  console.error('usage: node scripts/room-plan.mjs <room name or zone id> [--level ground|first|second] [--pad 36] [--out path.svg] [--no-pdf]')
  process.exit(2)
}
const query = pos.join(' ')

// ---------------------------------------------------------------- scene
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'))
const N = scene.nodes
const all = Object.values(N)
const levelKeyOf = (id) => Object.keys(LEVELS).find((k) => LEVELS[k] === id)

function findZone() {
  const q = query.toLowerCase()
  let cand = all.filter((n) => n.type === 'zone')
  if (opt.level) {
    if (!LEVELS[opt.level]) { console.error('bad --level'); process.exit(2) }
    cand = cand.filter((n) => n.parentId === LEVELS[opt.level])
  } else cand = cand.filter((n) => levelKeyOf(n.parentId))
  const byId = cand.filter((n) => n.id.toLowerCase() === q || n.id.toLowerCase().endsWith(q))
  if (byId.length === 1) return byId[0]
  for (const test of [(n) => n.name.toLowerCase() === q, (n) => n.name.toLowerCase().startsWith(q), (n) => n.name.toLowerCase().includes(q)]) {
    const m = cand.filter(test)
    if (m.length === 1) return m[0]
    if (m.length > 1) {
      console.error(`ambiguous "${query}"; pass --level or a zone id:`)
      for (const z of m) console.error(`  ${z.id}  [${levelKeyOf(z.parentId)}] ${z.name}`)
      process.exit(2)
    }
  }
  console.error(`no zone matches "${query}"`)
  process.exit(2)
}
const target = findZone()
const levelId = target.parentId
const levelKey = levelKeyOf(levelId)
const levelNode = N[levelId]

// ---------------------------------------------------------------- helpers (inches)
const I = (m) => m * M2IN
const P = (x, z) => [I(x), I(z)]
function fmtIn(inches) {
  let half = Math.round(inches * 2) // half-inches
  const neg = half < 0
  half = Math.abs(half)
  const ft = Math.floor(half / 24)
  const rem = half - ft * 24
  const whole = Math.floor(rem / 2)
  const frac = rem % 2 ? '½' : ''
  const s = `${ft}'-${whole}${frac}"`
  return (neg ? '-' : '') + s
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const r1 = (v) => Math.round(v * 10) / 10
function polyArea(pts) {
  let a = 0
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1] }
  return Math.abs(a) / 2
}
function bboxOf(pts) {
  let x0 = 1e18, z0 = 1e18, x1 = -1e18, z1 = -1e18
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  return { x0, z0, x1, z1 }
}
const boxHit = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.z0 <= b.z1 && a.z1 >= b.z0

// ---------------------------------------------------------------- target + clip box
const tPoly = target.polygon.map(([x, z]) => P(x, z))
const tBox = bboxOf(tPoly)
// Clear box: the zone polygon runs to wall centrelines, so snap each bbox edge to the
// inside face of the wall (or the line of the separator) that bounds it.
const clear = { ...tBox }
{
  const lines = []
  for (const n of all) {
    if (n.parentId !== levelId || n.visible === false) continue
    if (n.type !== 'wall' && n.type !== 'separator') continue
    const a = P(...n.start), b = P(...n.end)
    lines.push({ a, b, t: n.type === 'wall' ? I(n.thickness || 0.2) : 0 })
  }
  const snap = (edge, axis, inward) => {
    // axis 0: vertical edge at x=edge (spans z); axis 1: horizontal edge at z=edge (spans x)
    const lo = axis === 0 ? tBox.z0 : tBox.x0, hi = axis === 0 ? tBox.z1 : tBox.x1
    let best = null
    for (const l of lines) {
      const c0 = axis === 0 ? l.a[0] : l.a[1], c1 = axis === 0 ? l.b[0] : l.b[1]
      if (Math.abs(c0 - c1) > 0.5) continue
      const c = (c0 + c1) / 2
      if (Math.abs(c - edge) > l.t / 2 + 2) continue
      const s0 = axis === 0 ? l.a[1] : l.a[0], s1 = axis === 0 ? l.b[1] : l.b[0]
      const ov = Math.min(hi, Math.max(s0, s1)) - Math.max(lo, Math.min(s0, s1))
      if (ov < 0.3 * (hi - lo)) continue
      const face = c + inward * l.t / 2
      if (!best || ov > best.ov + 1 || (Math.abs(ov - best.ov) <= 1 && l.t > best.t)) best = { ov, face, t: l.t }
    }
    return best ? best.face : edge
  }
  clear.x0 = snap(tBox.x0, 0, 1)
  clear.x1 = snap(tBox.x1, 0, -1)
  clear.z0 = snap(tBox.z0, 1, 1)
  clear.z1 = snap(tBox.z1, 1, -1)
}
const clip = { x0: clear.x0 - opt.pad, z0: clear.z0 - opt.pad, x1: clear.x1 + opt.pad, z1: clear.z1 + opt.pad }
const clipW = clip.x1 - clip.x0
const clipH = clip.z1 - clip.z0

// canvas (final px units; svg is written at half size so a 2x raster is 1600 wide)
const CW = 1600
const ML = 96, MR = 24, MT = 58, MB_PLAN = 20
const PW = CW - ML - MR
const S = PW / clipW // px per inch
const PH = Math.max(120, clipH * S)
const TB = 190 // title block height
const CH = Math.ceil(MT + PH + MB_PLAN + TB)
const X = (x) => ML + (x - clip.x0) * S
const Z = (z) => MT + (z - clip.z0) * S
const pt = (p) => `${r1(X(p[0]))},${r1(Z(p[1]))}`

// ---------------------------------------------------------------- svg buffers
const L = { zones: [], seps: [], rugs: [], walls: [], floor: [], cols: [], stairs: [], ceil: [], pdf: [], open: [], dims: [], text: [] }
const FONT = `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"`

// ---------------------------------------------------------------- label placer
const occupied = [] // label rects (px)
const shapes = [] // shape bboxes (px), {id, x0,y0,x1,y1}
const planBox = { x0: ML, y0: MT, x1: ML + PW, y1: MT + PH }
const rectOverlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
function textBox(lines, fs) {
  const w = Math.max(...lines.map((l) => [...l].length)) * fs * 0.56 + 6
  return { w, h: lines.length * (fs + 2) + 2 }
}
/**
 * Place a multi-line label near a shape. opts: {fs, bold, color, ownId, anchor:[x,y] px centre, half:[hw,hh], fixed:boolean, opacity}
 */
function placeLabel(lines, o) {
  const fs = o.fs || 12
  const { w, h } = textBox(lines, fs)
  const [ax, ay] = o.anchor
  const [hw, hh] = o.half || [0, 0]
  const cands = [[ax, ay, 0]]
  if (!o.fixed) {
    for (const r of [3, 12, 28, 55, 95, 150]) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2
        cands.push([ax + Math.cos(a) * (hw + w / 2 + r), ay + Math.sin(a) * (hh + h / 2 + r), r])
      }
    }
  }
  let best = null
  for (const [cx, cy, r] of cands) {
    const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }
    let cost = r * 0.6
    const outside = w * h - rectOverlap(box, planBox)
    cost += outside * 50
    for (const q of occupied) cost += rectOverlap(box, q) * 8
    for (const s of shapes) if (s.id !== o.ownId) cost += rectOverlap(box, s) * (s.weight ?? 0.4)
    if (!best || cost < best.cost) best = { cost, cx, cy, box }
  }
  occupied.push(best.box)
  const own = { x0: ax - hw, y0: ay - hh, x1: ax + hw, y1: ay + hh }
  if (!o.fixed && !o.noLeader && rectOverlap(best.box, own) === 0 && (hw > 0 || hh > 0 || Math.hypot(best.cx - ax, best.cy - ay) > 14)) {
    // leader from shape edge toward label
    L.text.push(`<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(best.cx)}" y2="${r1(best.cy)}" stroke="${o.color || '#555'}" stroke-width="1" opacity="0.7"/><circle cx="${r1(ax)}" cy="${r1(ay)}" r="2.2" fill="${o.color || '#555'}"/>`)
  }
  const op = o.opacity ?? 1
  const y0 = best.cy - h / 2 + fs + 1
  const t = lines
    .map((l, i) => `<text x="${r1(best.cx)}" y="${r1(y0 + i * (fs + 2))}" text-anchor="middle" font-size="${fs}" ${i === 0 && o.bold ? 'font-weight="700"' : ''} fill="${o.color || '#222'}">${esc(l)}</text>`)
    .join('')
  L.text.push(`<g ${FONT} stroke="#fff" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke" opacity="${op}">${t}</g>`)
}

// ---------------------------------------------------------------- zones
const zonesHere = all.filter((n) => n.type === 'zone' && n.parentId === levelId && n.visible !== false)
const zonePath = (z) => {
  const rings = [z.polygon, ...(z.holes || [])].filter((r) => r && r.length > 2)
  return rings.map((r) => 'M' + r.map(([x, zz]) => pt(P(x, zz))).join('L') + 'Z').join('')
}
for (const z of zonesHere) {
  if (z === target) continue
  L.zones.push(`<path d="${zonePath(z)}" fill="none" stroke="#a9b0b8" stroke-width="1.4" fill-rule="evenodd"/>`)
}
{
  const area = polyArea(tPoly) - (target.holes || []).reduce((s, h) => s + polyArea(h.map(([x, z]) => P(x, z))), 0)
  target._area = area
  L.zones.push(`<path d="${zonePath(target)}" fill="#fbf1de" stroke="#c9a86a" stroke-width="1.6" fill-rule="evenodd"/>`)
}

// ---------------------------------------------------------------- separators
for (const s of all.filter((n) => n.type === 'separator' && n.parentId === levelId && n.visible !== false)) {
  L.seps.push(`<line x1="${r1(X(I(s.start[0])))}" y1="${r1(Z(I(s.start[1])))}" x2="${r1(X(I(s.end[0])))}" y2="${r1(Z(I(s.end[1])))}" stroke="#4f7fa8" stroke-width="2" stroke-dasharray="9 6"/>`)
}

// ---------------------------------------------------------------- walls + openings
const walls = all.filter((n) => n.type === 'wall' && n.parentId === levelId && n.visible !== false)
const wallGeo = new Map()
for (const w of walls) {
  const a = P(...w.start), b = P(...w.end)
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (len < 1e-6) continue
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  wallGeo.set(w.id, { w, a, b, len, u, nf: [-u[1], u[0]], t: I(w.thickness || 0.2), ext0: 0, ext1: 0 })
}
// extend ends that meet another wall (closes outer corners)
const inWallBody = (p, g, skip) => {
  if (g.w.id === skip) return false
  const dx = p[0] - g.a[0], dz = p[1] - g.a[1]
  const s = dx * g.u[0] + dz * g.u[1]
  const d = dx * g.nf[0] + dz * g.nf[1]
  return s >= -g.t / 2 - 0.5 && s <= g.len + g.t / 2 + 0.5 && Math.abs(d) <= g.t / 2 + 0.5
}
for (const g of wallGeo.values()) {
  for (const o of wallGeo.values()) {
    if (!g.ext0 && inWallBody(g.a, o, g.w.id)) g.ext0 = g.t / 2
    if (!g.ext1 && inWallBody(g.b, o, g.w.id)) g.ext1 = g.t / 2
  }
}
const wpt = (g, s, d) => [g.a[0] + g.u[0] * s + g.nf[0] * d, g.a[1] + g.u[1] * s + g.nf[1] * d]
const poly = (pts) => 'M' + pts.map(pt).join('L') + 'Z'

function shortTag(name) {
  const n = name.split(' · ')[0].trim()
  if (/^open passage/i.test(n) || /^opening/i.test(n)) return 'Opening'
  if (/^entrance curtain wall/i.test(n)) return 'Curtain wall'
  return n.replace(/'$/, "'")
}

const openLabels = []
for (const g of wallGeo.values()) {
  const kids = all.filter((n) => (n.type === 'door' || n.type === 'window') && n.parentId === g.w.id && n.visible !== false)
  const gaps = kids
    .map((k) => ({ k, c: I(k.position[0]), hw: I(k.width) / 2 }))
    .sort((p, q) => p.c - q.c)
  // solid intervals
  let cur = -g.ext0
  const solids = []
  for (const gp of gaps) {
    const s0 = gp.c - gp.hw, s1 = gp.c + gp.hw
    if (s0 > cur) solids.push([cur, s0])
    cur = Math.max(cur, s1)
  }
  if (cur < g.len + g.ext1) solids.push([cur, g.len + g.ext1])
  for (const [s0, s1] of solids) {
    const pts = [wpt(g, s0, -g.t / 2), wpt(g, s1, -g.t / 2), wpt(g, s1, g.t / 2), wpt(g, s0, g.t / 2)]
    L.walls.push(`<path d="${poly(pts)}"/>`)
  }
  for (const gp of gaps) {
    const k = gp.k
    const s0 = gp.c - gp.hw, s1 = gp.c + gp.hw
    const W = 2 * gp.hw
    const line = (p, q, st) => `<line x1="${r1(X(p[0]))}" y1="${r1(Z(p[1]))}" x2="${r1(X(q[0]))}" y2="${r1(Z(q[1]))}" ${st}/>`
    // jamb lines
    L.open.push(line(wpt(g, s0, -g.t / 2), wpt(g, s0, g.t / 2), 'stroke="#2d2d2d" stroke-width="1.2"'))
    L.open.push(line(wpt(g, s1, -g.t / 2), wpt(g, s1, g.t / 2), 'stroke="#2d2d2d" stroke-width="1.2"'))
    let sideSign = 1
    if (k.type === 'window') {
      for (const d of [-g.t / 5, g.t / 5]) L.open.push(line(wpt(g, s0, d), wpt(g, s1, d), 'stroke="#5f84a8" stroke-width="1.8"'))
    } else if (k.openingKind === 'opening') {
      L.open.push(line(wpt(g, s0, 0), wpt(g, s1, 0), 'stroke="#2d2d2d" stroke-width="1.2" stroke-dasharray="6 5"'))
    } else {
      const flipped = Math.abs(Math.abs(k.rotation?.[1] ?? 0) - Math.PI) < 0.5 || k.side === 'back'
      let hingeAtStart = (k.hingesSide || 'left') === 'left'
      let swing = (k.swingDirection || 'inward') === 'inward' ? 1 : -1
      if (flipped) { hingeAtStart = !hingeAtStart; swing = -swing }
      sideSign = swing
      const leaves = k.leafCount === 2 || k.doorType === 'double' ? 2 : 1
      const leafW = leaves === 2 ? W / 2 : W
      const hinges = leaves === 2 ? [[s0, 1], [s1, -1]] : [[hingeAtStart ? s0 : s1, hingeAtStart ? 1 : -1]]
      for (const [hs, dir] of hinges) {
        const H = wpt(g, hs, swing * g.t / 2)
        const closed = wpt(g, hs + dir * leafW, swing * g.t / 2)
        const open = wpt(g, hs, swing * (g.t / 2 + leafW))
        L.open.push(line(H, open, 'stroke="#2d2d2d" stroke-width="2"'))
        const v1 = [(closed[0] - H[0]) * S, (closed[1] - H[1]) * S]
        const v2 = [(open[0] - H[0]) * S, (open[1] - H[1]) * S]
        const sweep = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 1 : 0
        const rr = leafW * S
        L.open.push(`<path d="M${pt(closed)}A${r1(rr)},${r1(rr)} 0 0 ${sweep} ${pt(open)}" fill="none" stroke="#777" stroke-width="1.1"/>`)
      }
    }
    // label anchor: outside the wall on the swing side (or front)
    const anchorPt = wpt(g, gp.c, sideSign * (g.t / 2 + 7))
    const tag = shortTag(k.name)
    openLabels.push({
      lines: [tag, fmtIn(W)],
      anchor: [X(anchorPt[0]), Z(anchorPt[1])],
      center: wpt(g, gp.c, 0),
      color: k.type === 'window' ? '#3f6a93' : '#8a4b00',
    })
  }
}

// ---------------------------------------------------------------- columns
for (const c of all.filter((n) => n.type === 'column' && n.parentId === levelId && n.visible !== false)) {
  const [cx, cz] = P(c.position[0], c.position[2])
  const hw = I(c.width ?? 0.3) / 2, hd = I(c.depth ?? c.width ?? 0.3) / 2
  const ry = typeof c.rotation === 'number' ? c.rotation : (c.rotation?.[1] ?? 0)
  const cs = Math.cos(ry), sn = Math.sin(ry)
  const cor = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [cx + x * cs + z * sn, cz - x * sn + z * cs])
  if (!boxHit(bboxOf(cor), clip)) continue
  L.cols.push(`<path d="${poly(cor)}" fill="#222" stroke="#000" stroke-width="1"/>`)
}

// ---------------------------------------------------------------- items
const CEIL_RE = /ceiling|cove|pendant|chandelier|lights|downlights|drapes/i
function itemLevel(n) {
  const p = N[n.parentId]
  if (!p) return null
  if (p.type === 'level') return p.id
  if (p.type === 'ceiling' || p.type === 'slab' || p.type === 'item') return N[p.parentId]?.type === 'level' ? p.parentId : null
  return null
}
function shortName(name) {
  let s = name.replace(/^V\d+\s*·\s*(?:(?:first|ground|second)\s+floor\s*·\s*)?/i, '')
  s = s.replace(/\s*·\s*(elevation trace|PDF.*|ASSUMED.*)$/i, '')
  if ([...s].length > 26) s = [...s].slice(0, 25).join('') + '…'
  return s
}
const items = []
for (const it of all.filter((n) => n.type === 'item' && n.visible !== false)) {
  const parent = N[it.parentId]
  const lv = parent?.type === 'level' ? parent.id : (parent?.type === 'ceiling' ? parent.parentId : null)
  if (lv !== levelId) continue
  const bds = it.source?.manifest?.bounds
  if (!bds) continue
  const sc = it.scale || [1, 1, 1]
  const ry = it.rotation?.[1] ?? 0
  const cs = Math.cos(ry), sn = Math.sin(ry)
  const px = I(it.position[0]), pz = I(it.position[2])
  const x0 = I(bds.min[0]) * sc[0], x1 = I(bds.max[0]) * sc[0], z0 = I(bds.min[2]) * sc[2], z1 = I(bds.max[2]) * sc[2]
  const cor = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [px + x * cs + z * sn, pz - x * sn + z * cs])
  const bb = bboxOf(cor)
  if (!boxHit(bb, clip)) continue
  const ceilMounted = parent.type === 'ceiling' || CEIL_RE.test(it.name)
  const rug = /\brug\b/i.test(it.name)
  items.push({ it, cor, bb, ceilMounted, rug, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0), px, pz })
}
items.sort((a, b) => a.it.id.localeCompare(b.it.id))
const inTarget = (x, z) => x >= clear.x0 && x <= clear.x1 && z >= clear.z0 && z <= clear.z1
for (const m of items) {
  const near = inTarget(m.px, m.pz) || (m.bb.x1 > clear.x0 && m.bb.x0 < clear.x1 && m.bb.z1 > clear.z0 && m.bb.z0 < clear.z1)
  m.near = near
  const op = near ? 1 : 0.5
  if (m.ceilMounted) {
    L.ceil.push(`<path d="${poly(m.cor)}" fill="none" stroke="#7b8794" stroke-width="1.3" stroke-dasharray="6 4" opacity="${op}"/>`)
  } else if (m.rug) {
    L.rugs.push(`<path d="${poly(m.cor)}" fill="url(#dots)" stroke="#a79b87" stroke-width="1" stroke-dasharray="2 3" opacity="${op}"/>`)
  } else {
    L.floor.push(`<path d="${poly(m.cor)}" fill="#f1f3f5" stroke="#5a6570" stroke-width="1.5" opacity="${op}"/>`)
  }
  const sx0 = (bb) => ({ x0: X(bb.x0), y0: Z(bb.z0), x1: X(bb.x1), y1: Z(bb.z1) })
  m.px_box = sx0(m.bb)
  shapes.push({ id: m.it.id, ...m.px_box, weight: m.rug ? 0.02 : 0.4 })
}

// ---------------------------------------------------------------- stairs
const stairLabels = []
for (const st of all.filter((n) => n.type === 'stair' && n.parentId === levelId && n.visible !== false)) {
  const [sx, sz] = P(st.position[0], st.position[2])
  const rot = typeof st.rotation === 'number' ? st.rotation : (st.rotation?.[1] ?? 0)
  const cs = Math.cos(rot), sn = Math.sin(rot)
  const segs = (st.children || []).map((c) => N[c]).filter((c) => c && c.type === 'stair-segment')
  const w = I(st.width)
  const tr = ([x, z]) => [sx + x * cs + z * sn, sz - x * sn + z * cs]
  if (st.stairType === 'spiral' || !segs.length) {
    const rad = I((st.innerRadius || 0.2) + (st.width || 1))
    if (!boxHit({ x0: sx - rad, x1: sx + rad, z0: sz - rad, z1: sz + rad }, clip)) continue
    L.stairs.push(`<circle cx="${r1(X(sx))}" cy="${r1(Z(sz))}" r="${r1(rad * S)}" fill="none" stroke="#6b5a8a" stroke-width="1.6" stroke-dasharray="7 4"/><circle cx="${r1(X(sx))}" cy="${r1(Z(sz))}" r="3" fill="#6b5a8a"/>`)
    stairLabels.push({ lines: [shortName(st.name), `${st.stepCount} risers`], anchor: [X(sx), Z(sz)], half: [rad * S, rad * S] })
    continue
  }
  const total = segs.reduce((s, c) => s + I(c.length), 0)
  const cor = [[-w / 2, 0], [w / 2, 0], [w / 2, total], [-w / 2, total]].map(tr)
  if (!boxHit(bboxOf(cor), clip)) continue
  const sty = segs.length > 1 ? 'stroke-dasharray="8 4"' : ''
  let g = `<path d="${poly(cor)}" fill="#efeaf6" fill-opacity="0.6" stroke="#6b5a8a" stroke-width="1.8" ${sty}/>`
  let acc = 0
  for (const c of segs) {
    const n = c.stepCount || 1
    for (let k = 0; k <= n; k++) {
      const zz = acc + (I(c.length) * k) / n
      if (k === 0 && acc > 0) continue
      g += `<line x1="${r1(X(tr([-w / 2, zz])[0]))}" y1="${r1(Z(tr([-w / 2, zz])[1]))}" x2="${r1(X(tr([w / 2, zz])[0]))}" y2="${r1(Z(tr([w / 2, zz])[1]))}" stroke="#6b5a8a" stroke-width="0.9"/>`
    }
    acc += I(c.length)
  }
  // run arrow (rising direction = local +z)
  const a0 = tr([0, total * 0.15]), a1 = tr([0, total * 0.85])
  g += `<line x1="${r1(X(a0[0]))}" y1="${r1(Z(a0[1]))}" x2="${r1(X(a1[0]))}" y2="${r1(Z(a1[1]))}" stroke="#6b5a8a" stroke-width="1.6" marker-end="url(#arr)"/>`
  L.stairs.push(g)
  const bb = bboxOf(cor)
  stairLabels.push({
    lines: [shortName(st.name) + (segs.length > 1 ? ' (straight approx.)' : ''), `${st.stepCount} risers`],
    anchor: [X((bb.x0 + bb.x1) / 2), Z((bb.z0 + bb.z1) / 2)],
    half: [((bb.x1 - bb.x0) * S) / 2, ((bb.z1 - bb.z0) * S) / 2],
  })
  shapes.push({ id: st.id, x0: X(bb.x0), y0: Z(bb.z0), x1: X(bb.x1), y1: Z(bb.z1), weight: 0.1 })
}

// ---------------------------------------------------------------- PDF overlay
let pdfNote = 'off'
if (opt.pdf) {
  if (!fs.existsSync(PDF_JSON)) { pdfNote = 'missing'; console.error('warning: ' + PDF_JSON + ' not found, overlay skipped') }
  else {
    const sheet = JSON.parse(fs.readFileSync(PDF_JSON, 'utf8'))
    const [ox, oy] = PDF_ORIGIN[levelKey]
    const buckets = new Map()
    let kept = 0
    for (const s of sheet.segments) {
      if (s[6] === 1) continue // white
      const dx = s[2] - s[0], dy = s[3] - s[1]
      if (dx * dx + dy * dy < 4) continue
      const x0 = (s[0] - ox) * PT, z0 = (s[1] - oy) * PT, x1 = (s[2] - ox) * PT, z1 = (s[3] - oy) * PT
      if (!boxHit({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }, clip)) continue
      const sw = Math.round(Math.max(0.9, Math.min(2.6, (s[4] || 0) * PT * S * 0.55)) * 4) / 4
      if (!buckets.has(sw)) buckets.set(sw, [])
      buckets.get(sw).push(`M${r1(X(x0))},${r1(Z(z0))}L${r1(X(x1))},${r1(Z(z1))}`)
      kept++
    }
    for (const [sw, d] of [...buckets].sort((a, b) => a[0] - b[0])) L.pdf.push(`<path d="${d.join('')}" stroke-width="${sw}"/>`)
    pdfNote = `${kept} segments`
  }
}

// ---------------------------------------------------------------- labels (priority order)
// target name + size
{
  const cxp = X((clear.x0 + clear.x1) / 2), czp = Z((clear.z0 + clear.z1) / 2)
  const bw = clear.x1 - clear.x0, bd = clear.z1 - clear.z0
  const rect = target._area >= 0.97 * (tBox.x1 - tBox.x0) * (tBox.z1 - tBox.z0)
  const area = rect ? bw * bd : target._area
  const m2 = area * 0.0254 * 0.0254
  const sqft = area / 144
  placeLabel(
    [target.name, `${fmtIn(bw)} \u00d7 ${fmtIn(bd)} clear`, `${m2.toFixed(1)} m\u00b2 \u00b7 ${Math.round(sqft)} sq ft`],
    { fs: 18, bold: true, color: '#6b4a10', anchor: [cxp, czp], half: [0, 0], noLeader: true, ownId: '__target' },
  )
}
// neighbouring zones
for (const z of zonesHere) {
  if (z === target) continue
  const bb = bboxOf(z.polygon.map(([x, zz]) => P(x, zz)))
  if (!boxHit(bb, clip)) continue
  const v = { x0: Math.max(bb.x0, clip.x0), x1: Math.min(bb.x1, clip.x1), z0: Math.max(bb.z0, clip.z0), z1: Math.min(bb.z1, clip.z1) }
  const nm = z.name.length > 34 ? z.name.slice(0, 33) + '…' : z.name
  placeLabel([nm], { fs: 13, color: '#7d8791', anchor: [X((v.x0 + v.x1) / 2), Z((v.z0 + v.z1) / 2)], fixed: true, opacity: 0.9 })
}
// stairs
for (const sl of stairLabels) placeLabel(sl.lines, { fs: 12, bold: true, color: '#55437a', anchor: sl.anchor, half: sl.half, ownId: '__st' })
// furniture, biggest first
for (const m of [...items].sort((a, b) => b.w * b.d - a.w * a.d)) {
  const pxb = m.px_box
  const cxp = (pxb.x0 + pxb.x1) / 2, cyp = (pxb.y0 + pxb.y1) / 2
  if (cxp < planBox.x0 || cxp > planBox.x1 || cyp < planBox.y0 || cyp > planBox.y1) continue
  const nm = shortName(m.it.name)
  placeLabel([nm, `${Math.round(m.w)}×${Math.round(m.d)}`], {
    fs: 12,
    color: m.ceilMounted ? '#6c7783' : '#2b333b',
    anchor: [cxp, cyp],
    half: [(pxb.x1 - pxb.x0) / 2, (pxb.y1 - pxb.y0) / 2],
    ownId: m.it.id,
    opacity: m.near ? 1 : 0.6,
  })
}
// openings
for (const ol of openLabels) {
  const c = ol.anchor
  if (c[0] < planBox.x0 || c[0] > planBox.x1 || c[1] < planBox.y0 || c[1] > planBox.y1) continue
  placeLabel(ol.lines, { fs: 12, color: ol.color, anchor: c, half: [0, 0], ownId: '__op' })
}

// ---------------------------------------------------------------- dimensions
{
  const dimStyle = 'stroke="#222" stroke-width="1.3" fill="none"'
  const tx0 = X(clear.x0), tx1 = X(clear.x1), ty0 = Z(clear.z0), ty1 = Z(clear.z1)
  const yTop = MT - 24
  const xLeft = ML - 34
  const tick = (x, y, dx, dy) => `<line x1="${r1(x - dx)}" y1="${r1(y - dy)}" x2="${r1(x + dx)}" y2="${r1(y + dy)}" stroke="#222" stroke-width="1.6"/>`
  const bw = clear.x1 - clear.x0, bd = clear.z1 - clear.z0
  L.dims.push(`<line x1="${r1(tx0)}" y1="${yTop}" x2="${r1(tx1)}" y2="${yTop}" ${dimStyle}/>`)
  L.dims.push(`<line x1="${r1(tx0)}" y1="${yTop - 7}" x2="${r1(tx0)}" y2="${r1(MT)}" stroke="#888" stroke-width="0.8"/>`)
  L.dims.push(`<line x1="${r1(tx1)}" y1="${yTop - 7}" x2="${r1(tx1)}" y2="${r1(MT)}" stroke="#888" stroke-width="0.8"/>`)
  L.dims.push(tick(tx0, yTop, 5, 5), tick(tx1, yTop, 5, 5))
  L.dims.push(`<text x="${r1((tx0 + tx1) / 2)}" y="${yTop - 7}" text-anchor="middle" font-size="16" font-weight="700" fill="#222" ${FONT}>${esc(fmtIn(bw))}</text>`)
  L.dims.push(`<line x1="${xLeft}" y1="${r1(ty0)}" x2="${xLeft}" y2="${r1(ty1)}" ${dimStyle}/>`)
  L.dims.push(`<line x1="${xLeft - 7}" y1="${r1(ty0)}" x2="${ML}" y2="${r1(ty0)}" stroke="#888" stroke-width="0.8"/>`)
  L.dims.push(`<line x1="${xLeft - 7}" y1="${r1(ty1)}" x2="${ML}" y2="${r1(ty1)}" stroke="#888" stroke-width="0.8"/>`)
  L.dims.push(tick(xLeft, ty0, 5, 5), tick(xLeft, ty1, 5, 5))
  L.dims.push(`<text transform="translate(${xLeft - 8},${r1((ty0 + ty1) / 2)}) rotate(-90)" text-anchor="middle" font-size="16" font-weight="700" fill="#222" ${FONT}>${esc(fmtIn(bd))}</text>`)
}

// ---------------------------------------------------------------- title block
const tbY = MT + PH + MB_PLAN
let tb = ''
{
  const levelName = levelNode?.name || levelKey
  tb += `<line x1="${ML}" y1="${tbY}" x2="${CW - MR}" y2="${tbY}" stroke="#222" stroke-width="2"/>`
  tb += `<text x="${ML}" y="${tbY + 38}" font-size="30" font-weight="700" fill="#111" ${FONT}>${esc(target.name)}</text>`
  tb += `<text x="${ML}" y="${tbY + 68}" font-size="19" fill="#333" ${FONT}>${esc(levelName)}  ·  zone ${esc(target.id)}</text>`
  tb += `<rect x="${ML}" y="${tbY + 88}" width="26" height="12" fill="#4a4a4a"/><text x="${ML + 34}" y="${tbY + 99}" font-size="16" fill="#222" ${FONT}>Model (grey)</text>`
  tb += `<line x1="${ML + 150}" y1="${tbY + 94}" x2="${ML + 176}" y2="${tbY + 94}" stroke="#e0262a" stroke-width="2.5" opacity="0.7"/><text x="${ML + 184}" y="${tbY + 99}" font-size="16" fill="#222" ${FONT}>Building Control drawing (red)${opt.pdf ? '' : ' – overlay off'}</text>`
  tb += `<text x="${ML}" y="${tbY + 130}" font-size="14" fill="#555" ${FONT}>Solid = floor item, dashed = ceiling-mounted, dotted = rug, blue dashed = separator. Item sizes W×D in inches.</text>`
  tb += `<text x="${ML}" y="${tbY + 152}" font-size="14" fill="#555" ${FONT}>Clear sizes are the room zone bounding box (inside wall faces). Pad ${opt.pad} in.</text>`
  // scale bar (5 ft)
  const sbW = 60 * S
  const sbX = CW - MR - 140 - sbW, sbY = tbY + 56
  tb += `<rect x="${r1(sbX)}" y="${sbY}" width="${r1(sbW / 2)}" height="8" fill="#222"/><rect x="${r1(sbX + sbW / 2)}" y="${sbY}" width="${r1(sbW / 2)}" height="8" fill="#fff" stroke="#222" stroke-width="1.2"/>`
  tb += `<text x="${r1(sbX)}" y="${sbY - 6}" font-size="14" fill="#222" ${FONT}>0</text><text x="${r1(sbX + sbW)}" y="${sbY - 6}" text-anchor="end" font-size="14" fill="#222" ${FONT}>5 ft</text>`
  // street arrow
  const ax = CW - MR - 60
  tb += `<line x1="${ax}" y1="${tbY + 20}" x2="${ax}" y2="${tbY + 78}" stroke="#222" stroke-width="3" marker-end="url(#arrB)"/>`
  tb += `<text x="${ax}" y="${tbY + 112}" text-anchor="middle" font-size="18" font-weight="700" fill="#222" ${FONT}>Street ↓</text>`
  tb += `<text x="${ax}" y="${tbY + 134}" text-anchor="middle" font-size="13" fill="#555" ${FONT}>+Z (south)</text>`
}

// ---------------------------------------------------------------- assemble svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW / 2}" height="${CH / 2}" viewBox="0 0 ${CW} ${CH}">
<defs>
<clipPath id="plan"><rect x="${ML}" y="${MT}" width="${PW}" height="${r1(PH)}"/></clipPath>
<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1" fill="#b9ad98"/></pattern>
<marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0L8,4L0,8z" fill="#6b5a8a"/></marker>
<marker id="arrB" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0L12,6L0,12z" fill="#222"/></marker>
</defs>
<rect width="${CW}" height="${CH}" fill="#fff"/>
<rect x="${ML}" y="${MT}" width="${PW}" height="${r1(PH)}" fill="#fff" stroke="#bbb" stroke-width="1"/>
<g clip-path="url(#plan)">
<g id="zones">${L.zones.join('')}</g>
<g id="separators">${L.seps.join('')}</g>
<g id="rugs">${L.rugs.join('')}</g>
<g id="walls" fill="#4a4a4a" stroke="#4a4a4a" stroke-width="0.6">${L.walls.join('')}</g>
<g id="openings" fill="none">${L.open.join('')}</g>
<g id="floor-items">${L.floor.join('')}</g>
<g id="columns">${L.cols.join('')}</g>
<g id="stairs">${L.stairs.join('')}</g>
<g id="ceiling-items">${L.ceil.join('')}</g>
<g id="bc-overlay" fill="none" stroke="#e0262a" stroke-opacity="0.6" stroke-linecap="round">${L.pdf.join('')}</g>
<g id="labels">${L.text.join('')}</g>
</g>
<g id="dimensions">${L.dims.join('')}</g>
<g id="title">${tb}</g>
</svg>
`

// ---------------------------------------------------------------- write
const slug = `${target.name}-${levelKey}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const outSvg = path.resolve(opt.out || path.join(OUT_DIR, `${slug}.svg`))
fs.mkdirSync(path.dirname(outSvg), { recursive: true })
fs.writeFileSync(outSvg, svg)
console.log(`svg: ${outSvg}  (${items.length} items, ${walls.length} walls, overlay: ${pdfNote})`)

if (process.env.ROOM_PLAN_NO_PNG !== '1') {
  const outPng = outSvg.replace(/\.svg$/i, '') + '.png'
  let bin = SVG2PNG
  if (!fs.existsSync(bin)) {
    fs.mkdirSync(path.dirname(bin), { recursive: true })
    const c = spawnSync('swiftc', ['-O', path.join(HERE, 'svg2png.swift'), '-o', bin], { stdio: 'inherit' })
    if (c.status !== 0) { console.error('could not compile svg2png.swift'); process.exit(1) }
  }
  const r = spawnSync(bin, [outSvg, outPng, '2'], { stdio: 'inherit' })
  if (r.status !== 0) { console.error('rasterise failed'); process.exit(1) }
  console.log(`png: ${outPng}`)
}
