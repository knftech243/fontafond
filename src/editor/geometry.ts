/**
 * Géométrie de l'éditeur de glyphe : fonctions pures, en unités de police (y vers le haut).
 * Un point est désigné par une clé « contour:point » (ex. « 0:3 »).
 */
import { getStroke } from 'perfect-freehand'
import type { Contour, Glyph, Point } from '../model/types'

export interface Vec {
  x: number
  y: number
}

export const pointKey = (c: number, p: number) => `${c}:${p}`
export const parseKey = (k: string): [number, number] => {
  const [c, p] = k.split(':').map(Number)
  return [c, p]
}

const round = (n: number) => Math.round(n)
export const snapValue = (v: number, step: number) => Math.round(v / step) * step
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)

/** Nœud du tracé en cours à la Plume : un point sur la courbe et ses poignées éventuelles. */
export interface PenNode extends Vec {
  in?: Vec
  out?: Vec
}

/** Transforme les nœuds de la Plume en contour fermé (points « on » + poignées « off »). */
export function nodesToContour(nodes: PenNode[]): Contour {
  const points: Point[] = []
  nodes.forEach((n, i) => {
    const next = nodes[(i + 1) % nodes.length]
    points.push({ x: round(n.x), y: round(n.y), type: 'on' })
    if (n.out) points.push({ x: round(n.out.x), y: round(n.out.y), type: 'off' })
    if (next.in) points.push({ x: round(next.in.x), y: round(next.in.y), type: 'off' })
  })
  return { points }
}

/** Approximation polygonale d'un contour (courbes échantillonnées). */
export function flatten(contour: Contour, steps = 8): Vec[] {
  const pts = contour.points
  const start = pts.findIndex((p) => p.type === 'on')
  if (start < 0) return pts.map((p) => ({ x: p.x, y: p.y }))
  const ordered = [...pts.slice(start), ...pts.slice(0, start)]
  const out: Vec[] = []
  let anchor = ordered[0]
  let offs: Point[] = []
  const emit = (to: Point) => {
    if (offs.length === 0) out.push({ x: to.x, y: to.y })
    else if (offs.length === 1) {
      const c = offs[0]
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const u = 1 - t
        out.push({ x: u * u * anchor.x + 2 * u * t * c.x + t * t * to.x, y: u * u * anchor.y + 2 * u * t * c.y + t * t * to.y })
      }
    } else {
      const c1 = offs[0]
      const c2 = offs[offs.length - 1]
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const u = 1 - t
        out.push({
          x: u * u * u * anchor.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
          y: u * u * u * anchor.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
        })
      }
    }
    anchor = to
    offs = []
  }
  out.push({ x: anchor.x, y: anchor.y })
  for (const p of ordered.slice(1)) {
    if (p.type === 'off') offs.push(p)
    else emit(p)
  }
  emit(ordered[0])
  out.pop() // le dernier point répète le premier
  return out
}

/** Aire signée (positive = sens inverse des aiguilles d'une montre, y vers le haut). */
export function signedArea(poly: Vec[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function pointInPolygon(pt: Vec, poly: Vec[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export const reverseContour = (c: Contour): Contour => ({ points: [...c.points].reverse() })

/** Oriente un contour : « outer » = sens positif (encre), sinon sens négatif (contreforme). */
export function orient(c: Contour, outer: boolean): Contour {
  const area = signedArea(flatten(c))
  return outer === area >= 0 ? c : reverseContour(c)
}

/**
 * Sens automatique d'un nouveau contour tracé à la Plume : contreforme s'il est
 * à l'intérieur d'un nombre impair de contours existants (ex. l'intérieur d'un « O »).
 */
export function orientNewContour(existing: Contour[], c: Contour): Contour {
  const first = c.points.find((p) => p.type === 'on') ?? c.points[0]
  if (!first) return c
  const depth = existing.filter((e) => pointInPolygon(first, flatten(e))).length
  return orient(c, depth % 2 === 0)
}

/** Simplification de Ramer-Douglas-Peucker sur un polygone fermé. */
export function simplifyClosed(poly: Vec[], tolerance: number): Vec[] {
  if (poly.length <= 4) return poly
  const rdp = (pts: Vec[]): Vec[] => {
    if (pts.length < 3) return pts
    const a = pts[0]
    const b = pts[pts.length - 1]
    let maxD = 0
    let idx = 0
    const len = dist(a, b) || 1
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]
      const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD <= tolerance) return [a, b]
    return [...rdp(pts.slice(0, idx + 1)).slice(0, -1), ...rdp(pts.slice(idx))]
  }
  // Coupe le polygone au point le plus éloigné du premier, puis simplifie les deux moitiés.
  let far = 0
  for (let i = 1; i < poly.length; i++) if (dist(poly[0], poly[i]) > dist(poly[0], poly[far])) far = i
  const first = rdp(poly.slice(0, far + 1))
  const second = rdp([...poly.slice(far), poly[0]])
  return [...first.slice(0, -1), ...second.slice(0, -1)]
}

export interface BrushSample {
  x: number
  y: number
  pressure: number
}

export interface BrushOptions {
  size: number
  smoothing: number // 0 à 1
  usePressure: boolean
}

/** Contour (polygone) d'un trait de pinceau, avant simplification : sert aussi à l'aperçu en direct. */
export function brushOutline(samples: BrushSample[], o: BrushOptions, last = true): Vec[] {
  const stroke = getStroke(
    samples.map((s) => [s.x, s.y, s.pressure]),
    {
      size: o.size,
      thinning: o.usePressure ? 0.6 : 0.45,
      smoothing: o.smoothing,
      streamline: Math.min(0.9, o.smoothing * 0.8),
      simulatePressure: !o.usePressure,
      last,
    },
  )
  return stroke.map(([x, y]) => ({ x, y }))
}

/** Trait de pinceau → contour fermé, simplifié et orienté comme de l'encre. */
export function brushToContour(samples: BrushSample[], o: BrushOptions): Contour | null {
  if (samples.length === 0) return null
  const outline = brushOutline(samples, o)
  if (outline.length < 3) return null
  const simple = simplifyClosed(outline, Math.max(1, o.size * 0.02))
  if (simple.length < 3) return null
  const contour: Contour = { points: simple.map((p) => ({ x: round(p.x), y: round(p.y), type: 'on' as const })) }
  return orient(contour, true)
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function bbox(contours: Contour[]): Box | null {
  const pts = contours.flatMap((c) => flatten(c))
  if (pts.length === 0) return null
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  }
}

/** Approches (espaces gauche et droite) d'un glyphe dessiné. */
export function bearings(g: Glyph): { left: number; right: number } | null {
  const b = bbox(g.contours)
  if (!b) return null
  return { left: round(b.minX), right: round(g.advanceWidth - b.maxX) }
}

const mapPoints = (contours: Contour[], f: (p: Point, c: number, i: number) => Point): Contour[] =>
  contours.map((c, ci) => ({ points: c.points.map((p, pi) => f(p, ci, pi)) }))

/** Approche gauche : décale tout le dessin, en gardant l'approche droite. */
export function setLeftBearing(g: Glyph, left: number): Glyph {
  const b = bbox(g.contours)
  if (!b) return g
  const dx = round(left - b.minX)
  return { ...g, advanceWidth: Math.max(0, g.advanceWidth + dx), contours: mapPoints(g.contours, (p) => ({ ...p, x: p.x + dx })) }
}

/** Approche droite : change la chasse. */
export function setRightBearing(g: Glyph, right: number): Glyph {
  const b = bbox(g.contours)
  if (!b) return g
  return { ...g, advanceWidth: Math.max(0, round(b.maxX + right)) }
}

/** Voisins (indices) d'un point dans son contour, avec bouclage. */
const prevIdx = (n: number, i: number) => (i - 1 + n) % n
const nextIdx = (n: number, i: number) => (i + 1) % n

/** Ajoute aux points sélectionnés les poignées de leurs points « on » (elles suivent leur point). */
export function withHandles(contours: Contour[], keys: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const k of keys) {
    out.add(k)
    const [c, p] = parseKey(k)
    const pts = contours[c]?.points
    if (!pts || pts[p]?.type !== 'on') continue
    const a = prevIdx(pts.length, p)
    const b = nextIdx(pts.length, p)
    if (pts[a].type === 'off') out.add(pointKey(c, a))
    if (pts[b].type === 'off') out.add(pointKey(c, b))
  }
  return out
}

export function movePoints(contours: Contour[], keys: Iterable<string>, dx: number, dy: number): Contour[] {
  const moving = withHandles(contours, keys)
  return mapPoints(contours, (p, c, i) => (moving.has(pointKey(c, i)) ? { ...p, x: round(p.x + dx), y: round(p.y + dy) } : p))
}

/**
 * Déplace une poignée. Si son point est lisse (poignée de chaque côté), la poignée opposée
 * reste alignée en gardant sa longueur, sauf si `free` (touche Alt).
 */
export function moveHandle(contours: Contour[], key: string, to: Vec, free: boolean): Contour[] {
  const [c, i] = parseKey(key)
  const pts = contours[c]?.points
  if (!pts || pts[i]?.type !== 'off') return contours
  const n = pts.length
  const a = prevIdx(n, i)
  const b = nextIdx(n, i)
  const anchorIdx = pts[a].type === 'on' ? a : pts[b].type === 'on' ? b : -1
  const next = contours.map((ct) => ({ points: [...ct.points] }))
  next[c].points[i] = { ...pts[i], x: round(to.x), y: round(to.y) }
  if (anchorIdx < 0 || free) return next
  const anchor = pts[anchorIdx]
  const oppIdx = anchorIdx === a ? prevIdx(n, anchorIdx) : nextIdx(n, anchorIdx)
  const opp = pts[oppIdx]
  if (oppIdx === i || opp.type !== 'off') return next
  const len = dist(opp, anchor)
  const vx = anchor.x - to.x
  const vy = anchor.y - to.y
  const vl = Math.hypot(vx, vy) || 1
  next[c].points[oppIdx] = { ...opp, x: round(anchor.x + (vx / vl) * len), y: round(anchor.y + (vy / vl) * len) }
  return next
}

/** Supprime des points (et les poignées de leurs points « on ») ; un contour trop petit disparaît. */
export function deletePoints(contours: Contour[], keys: Iterable<string>): Contour[] {
  const gone = withHandles(contours, keys)
  return contours
    .map((c, ci) => ({ points: c.points.filter((_, pi) => !gone.has(pointKey(ci, pi))) }))
    .filter((c) => c.points.filter((p) => p.type === 'on').length >= 2 && c.points.length >= 3)
}

export function allKeys(contours: Contour[]): string[] {
  return contours.flatMap((c, ci) => c.points.map((_, pi) => pointKey(ci, pi)))
}

/** Point le plus proche dans un rayon donné (unités de police). */
export function hitPoint(contours: Contour[], at: Vec, radius: number, includeOff: boolean): string | null {
  let best: string | null = null
  let bestD = radius
  contours.forEach((c, ci) =>
    c.points.forEach((p, pi) => {
      if (!includeOff && p.type === 'off') return
      const d = dist(p, at)
      if (d <= bestD) {
        bestD = d
        best = pointKey(ci, pi)
      }
    }),
  )
  return best
}

/** Contour (le plus haut dans l'ordre de dessin) qui contient le point. */
export function hitContour(contours: Contour[], at: Vec): number | null {
  for (let i = contours.length - 1; i >= 0; i--) if (pointInPolygon(at, flatten(contours[i]))) return i
  return null
}

export function pointsInRect(contours: Contour[], a: Vec, b: Vec): string[] {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  const out: string[] = []
  contours.forEach((c, ci) =>
    c.points.forEach((p, pi) => {
      if (p.type === 'on' && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) out.push(pointKey(ci, pi))
    }),
  )
  return out
}

/** Indices des contours touchés par une sélection. */
export function contoursOf(keys: Iterable<string>): number[] {
  return [...new Set([...keys].map((k) => parseKey(k)[0]))].sort((x, y) => x - y)
}

// ---------------------------------------------------------------------------
// Segments : un contour vu comme une suite de points d'ancrage reliés par des segments
// (0 poignée = droite, 1 = quadratique, 2 = cubique).
// ---------------------------------------------------------------------------

export interface Segs {
  anchors: Point[]
  /** segs[k] relie anchors[k] à anchors[k + 1] (en bouclant). */
  segs: Vec[][]
  /** Indice d'origine (dans contour.points) de chaque point d'ancrage. */
  onIdx: number[]
}

export function toSegs(contour: Contour): Segs {
  const pts = contour.points
  const n = pts.length
  const start = pts.findIndex((p) => p.type === 'on')
  const anchors: Point[] = []
  const segs: Vec[][] = []
  const onIdx: number[] = []
  if (start < 0) return { anchors, segs, onIdx }
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n
    const p = pts[i]
    if (p.type === 'on') {
      anchors.push(p)
      onIdx.push(i)
      segs.push([])
    } else segs[segs.length - 1].push({ x: p.x, y: p.y })
  }
  return { anchors, segs, onIdx }
}

/** Reconstruit un contour ; renvoie aussi la position de chaque point d'ancrage dans le résultat. */
export function fromSegs(anchors: Point[], segs: Vec[][]): { contour: Contour; anchorAt: number[] } {
  const points: Point[] = []
  const anchorAt: number[] = []
  anchors.forEach((a, k) => {
    anchorAt.push(points.length)
    points.push({ x: round(a.x), y: round(a.y), type: 'on' })
    for (const o of segs[k] ?? []) points.push({ x: round(o.x), y: round(o.y), type: 'off' })
  })
  return { contour: { points }, anchorAt }
}

const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Point d'un segment au paramètre t (0 à 1). */
export function evalSegment(a: Vec, offs: Vec[], b: Vec, t: number): Vec {
  if (offs.length === 0) return lerp(a, b, t)
  if (offs.length === 1) return lerp(lerp(a, offs[0], t), lerp(offs[0], b, t), t)
  const c1 = offs[0]
  const c2 = offs[offs.length - 1]
  const p01 = lerp(a, c1, t)
  const p12 = lerp(c1, c2, t)
  const p23 = lerp(c2, b, t)
  return lerp(lerp(p01, p12, t), lerp(p12, p23, t), t)
}

const distToSegment = (p: Vec, a: Vec, b: Vec): { d: number; u: number } => {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const len2 = vx * vx + vy * vy
  const u = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0
  return { d: Math.hypot(p.x - (a.x + u * vx), p.y - (a.y + u * vy)), u }
}

export interface SegmentHit {
  c: number
  seg: number
  t: number
  point: Vec
}

/** Segment le plus proche d'un point (dans un rayon donné), avec la position t sur ce segment. */
export function hitSegment(contours: Contour[], at: Vec, radius: number, steps = 32): SegmentHit | null {
  let best: SegmentHit | null = null
  let bestD = radius
  contours.forEach((contour, c) => {
    const { anchors, segs } = toSegs(contour)
    anchors.forEach((a, k) => {
      const b = anchors[(k + 1) % anchors.length]
      let prev: Vec = a
      for (let i = 1; i <= steps; i++) {
        const cur = evalSegment(a, segs[k], b, i / steps)
        const { d, u } = distToSegment(at, prev, cur)
        if (d <= bestD) {
          bestD = d
          const t = (i - 1 + u) / steps
          best = { c, seg: k, t, point: evalSegment(a, segs[k], b, t) }
        }
        prev = cur
      }
    })
  })
  return best
}

/** Insère un point d'ancrage au paramètre t d'un segment, sans changer la forme (De Casteljau). */
export function splitSegmentAt(contour: Contour, seg: number, t: number): { contour: Contour; inserted: number } {
  const { anchors, segs } = toSegs(contour)
  const a = anchors[seg]
  const b = anchors[(seg + 1) % anchors.length]
  const offs = segs[seg]
  let first: Vec[]
  let second: Vec[]
  let m: Vec
  if (offs.length === 0) {
    m = lerp(a, b, t)
    first = []
    second = []
  } else if (offs.length === 1) {
    const q0 = lerp(a, offs[0], t)
    const q1 = lerp(offs[0], b, t)
    m = lerp(q0, q1, t)
    first = [q0]
    second = [q1]
  } else {
    const c1 = offs[0]
    const c2 = offs[offs.length - 1]
    const p01 = lerp(a, c1, t)
    const p12 = lerp(c1, c2, t)
    const p23 = lerp(c2, b, t)
    const p012 = lerp(p01, p12, t)
    const p123 = lerp(p12, p23, t)
    m = lerp(p012, p123, t)
    first = [p01, p012]
    second = [p123, p23]
  }
  const newAnchors = [...anchors.slice(0, seg + 1), { x: m.x, y: m.y, type: 'on' as const }, ...anchors.slice(seg + 1)]
  const newSegs = [...segs.slice(0, seg), first, second, ...segs.slice(seg + 1)]
  const { contour: out, anchorAt } = fromSegs(newAnchors, newSegs)
  return { contour: out, inserted: anchorAt[seg + 1] }
}

const same = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

/** Retire les poignées inutiles (toutes rentrées sur leurs points) : le segment redevient une droite. */
function cleanSegs(anchors: Point[], segs: Vec[][]): Vec[][] {
  return segs.map((offs, k) => {
    const a = anchors[k]
    const b = anchors[(k + 1) % anchors.length]
    return offs.every((o) => same(o, a) || same(o, b)) ? [] : offs
  })
}

/** Indice du point d'ancrage correspondant à un indice de point d'origine. */
const anchorOf = (s: Segs, pointIndex: number) => s.onIdx.indexOf(pointIndex)

/** Point lisse → angle : ses poignées sont rentrées (comme l'outil Conversion de point). */
export function convertToCorner(contour: Contour, pointIndex: number): Contour {
  const s = toSegs(contour)
  const k = anchorOf(s, pointIndex)
  if (k < 0) return contour
  const n = s.anchors.length
  const segs = s.segs.map((o) => [...o])
  const before = segs[(k - 1 + n) % n]
  const after = segs[k]
  const p = s.anchors[k]
  if (before.length === 2) before[1] = { x: p.x, y: p.y }
  else if (before.length === 1) before.length = 0
  if (after.length === 2) after[0] = { x: p.x, y: p.y }
  else if (after.length === 1) after.length = 0
  return fromSegs(s.anchors, cleanSegs(s.anchors, segs)).contour
}

/** Vrai si le point d'ancrage a au moins une poignée non rentrée. */
export function isSmoothPoint(contour: Contour, pointIndex: number): boolean {
  const s = toSegs(contour)
  const k = anchorOf(s, pointIndex)
  if (k < 0) return false
  const n = s.anchors.length
  const p = s.anchors[k]
  const before = s.segs[(k - 1 + n) % n]
  const after = s.segs[k]
  const inH = before.length ? before[before.length - 1] : null
  const outH = after.length ? after[0] : null
  return (!!inH && !same(inH, p)) || (!!outH && !same(outH, p))
}

/**
 * Donne au point d'ancrage une poignée d'entrée et de sortie (segments convertis en cubiques
 * si besoin, sans changer la forme) ; renvoie le contour et les indices des deux poignées.
 */
export function ensureHandles(contour: Contour, pointIndex: number): { contour: Contour; inIdx: number; outIdx: number; anchorIdx: number } | null {
  const s = toSegs(contour)
  const k = anchorOf(s, pointIndex)
  if (k < 0) return null
  const n = s.anchors.length
  const toCubic = (j: number): Vec[] => {
    const a = s.anchors[j]
    const b = s.anchors[(j + 1) % n]
    const offs = s.segs[j]
    if (offs.length === 2) return [...offs]
    if (offs.length === 1) {
      const q = offs[0]
      return [lerp(a, q, 2 / 3), lerp(b, q, 2 / 3)]
    }
    return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]
  }
  const segs = s.segs.map((o) => [...o])
  const bi = (k - 1 + n) % n
  segs[bi] = toCubic(bi)
  segs[k] = toCubic(k)
  const { contour: out, anchorAt } = fromSegs(s.anchors, segs)
  const anchorIdx = anchorAt[k]
  const len = out.points.length
  return { contour: out, anchorIdx, inIdx: (anchorIdx - 1 + len) % len, outIdx: (anchorIdx + 1) % len }
}

/** Nœud de la Plume de courbure : un point par lequel la courbe passe ; `corner` = angle. */
export interface CurvNode extends Vec {
  corner?: boolean
}

/** Calcule les poignées pour que la courbe passe par tous les points (façon Catmull-Rom). */
export function curvatureNodes(nodes: CurvNode[], closed: boolean): PenNode[] {
  const n = nodes.length
  if (n < 2) return nodes.map((p) => ({ x: p.x, y: p.y }))
  return nodes.map((p, i) => {
    const prev = i > 0 ? nodes[i - 1] : closed ? nodes[n - 1] : null
    const next = i < n - 1 ? nodes[i + 1] : closed ? nodes[0] : null
    if (p.corner || n === 2) return { x: p.x, y: p.y }
    const a = prev ?? p
    const b = next ?? p
    const tx = b.x - a.x
    const ty = b.y - a.y
    const tl = Math.hypot(tx, ty) || 1
    const ux = tx / tl
    const uy = ty / tl
    const node: PenNode = { x: p.x, y: p.y }
    if (prev) {
      const l = dist(prev, p) / 3
      node.in = { x: p.x - ux * l, y: p.y - uy * l }
    }
    if (next) {
      const l = dist(p, next) / 3
      node.out = { x: p.x + ux * l, y: p.y + uy * l }
    }
    return node
  })
}
