import { describe, expect, it } from 'vitest'
import { createEmptyGlyph } from '../model/project'
import type { Contour } from '../model/types'
import {
  bearings,
  brushToContour,
  deletePoints,
  flatten,
  hitContour,
  hitPoint,
  moveHandle,
  movePoints,
  nodesToContour,
  orientNewContour,
  pointsInRect,
  setLeftBearing,
  setRightBearing,
  signedArea,
  simplifyClosed,
} from './geometry'
import { emptyHistory, record, redo, undo } from './history'

const square = (x: number, y: number, s: number): Contour => ({
  points: [
    { x, y, type: 'on' },
    { x: x + s, y, type: 'on' },
    { x: x + s, y: y + s, type: 'on' },
    { x, y: y + s, type: 'on' },
  ],
})

describe('Plume', () => {
  it('transforme des nœuds avec poignées en contour', () => {
    const c = nodesToContour([{ x: 0, y: 0 }, { x: 100, y: 0, in: { x: 80, y: -20 }, out: { x: 120, y: 20 } }, { x: 50, y: 80 }])
    expect(c.points.map((p) => p.type).join(',')).toBe('on,off,on,off,on')
  })

  it("oriente une contreforme à l'envers de la forme qui la contient", () => {
    const outer = orientNewContour([], square(0, 0, 100))
    const inner = orientNewContour([outer], square(25, 25, 50))
    expect(signedArea(flatten(outer))).toBeGreaterThan(0)
    expect(signedArea(flatten(inner))).toBeLessThan(0)
  })
})

describe('Pinceau', () => {
  it('produit un contour fermé, simplifié et orienté comme de l’encre', () => {
    const samples = Array.from({ length: 40 }, (_, i) => ({ x: i * 10, y: Math.sin(i / 5) * 60, pressure: 0.5 }))
    const c = brushToContour(samples, { size: 60, smoothing: 0.5, usePressure: false })
    expect(c).not.toBeNull()
    expect(c!.points.length).toBeGreaterThan(4)
    expect(c!.points.every((p) => p.type === 'on' && Number.isInteger(p.x))).toBe(true)
    expect(signedArea(flatten(c!))).toBeGreaterThan(0)
  })

  it('simplifie un polygone sans perdre ses coins', () => {
    const dense = [
      ...Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 0 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 100, y: i * 10 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 100 - i * 10, y: 100 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0, y: 100 - i * 10 })),
    ]
    expect(simplifyClosed(dense, 1)).toHaveLength(4)
  })
})

describe('Sélection', () => {
  const curve: Contour = {
    points: [
      { x: 0, y: 0, type: 'on' },
      { x: 40, y: 0, type: 'off' },
      { x: 100, y: 60, type: 'off' },
      { x: 100, y: 100, type: 'on' },
      { x: 100, y: 140, type: 'off' },
      { x: 0, y: 140, type: 'on' },
    ],
  }

  it('déplace un point avec ses poignées', () => {
    const [c] = movePoints([curve], ['0:3'], 10, -5)
    expect(c.points[3]).toMatchObject({ x: 110, y: 95 })
    expect(c.points[2]).toMatchObject({ x: 110, y: 55 })
    expect(c.points[4]).toMatchObject({ x: 110, y: 135 })
    expect(c.points[0]).toMatchObject({ x: 0, y: 0 })
  })

  it('garde la poignée opposée alignée, sauf avec Alt', () => {
    const [c] = moveHandle([curve], '0:4', { x: 140, y: 100 }, false)
    expect(c.points[2]).toMatchObject({ x: 60, y: 100 })
    const [free] = moveHandle([curve], '0:4', { x: 140, y: 100 }, true)
    expect(free.points[2]).toMatchObject({ x: 100, y: 60 })
  })

  it('supprime des points et retire un contour devenu trop petit', () => {
    expect(deletePoints([square(0, 0, 100)], ['0:0'])[0].points).toHaveLength(3)
    expect(deletePoints([square(0, 0, 100)], ['0:0', '0:1', '0:2'])).toHaveLength(0)
  })

  it('trouve un point, un contour et une sélection par cadre', () => {
    const shapes = [square(0, 0, 100), square(200, 0, 100)]
    expect(hitPoint(shapes, { x: 203, y: 2 }, 10, false)).toBe('1:0')
    expect(hitContour(shapes, { x: 250, y: 50 })).toBe(1)
    expect(hitContour(shapes, { x: 150, y: 50 })).toBeNull()
    expect(pointsInRect(shapes, { x: -10, y: -10 }, { x: 110, y: 50 })).toEqual(['0:0', '0:1'])
  })
})

describe('Approches', () => {
  it('calcule et modifie les approches gauche et droite', () => {
    const g = { ...createEmptyGlyph('O'), advanceWidth: 600, contours: [square(50, 0, 400)] }
    expect(bearings(g)).toEqual({ left: 50, right: 150 })
    const left = setLeftBearing(g, 80)
    expect(bearings(left)).toEqual({ left: 80, right: 150 })
    expect(setRightBearing(g, 60).advanceWidth).toBe(510)
    expect(bearings(createEmptyGlyph('A'))).toBeNull()
  })
})

describe('Historique', () => {
  it('annule et rétablit, puis oublie le futur après un nouveau geste', () => {
    const v0 = createEmptyGlyph('A')
    const v1 = { ...v0, advanceWidth: 700 }
    let current = v1
    let h = record(emptyHistory(), { char: 'A', glyph: v0 })
    const u = undo(h, () => current)!
    expect(u.restore.glyph.advanceWidth).toBe(v0.advanceWidth)
    current = u.restore.glyph
    h = u.history
    const r = redo(h, () => current)!
    expect(r.restore.glyph.advanceWidth).toBe(700)
    expect(undo(emptyHistory(), () => current)).toBeNull()
    const after = record(u.history, { char: 'A', glyph: v0 })
    expect(after.future).toHaveLength(0)
  })

  it('limite la longueur de l’historique', () => {
    let h = emptyHistory()
    for (let i = 0; i < 120; i++) h = record(h, { char: 'A', glyph: createEmptyGlyph('A') })
    expect(h.past).toHaveLength(100)
  })
})

import { convertToCorner, curvatureNodes, ensureHandles, evalSegment, hitSegment, isSmoothPoint, splitSegmentAt, toSegs } from './geometry'

describe('Famille Plume', () => {
  const cubic: Contour = {
    points: [
      { x: 0, y: 0, type: 'on' },
      { x: 0, y: 100, type: 'off' },
      { x: 100, y: 200, type: 'off' },
      { x: 200, y: 200, type: 'on' },
      { x: 200, y: 0, type: 'on' },
    ],
  }

  it('ajoute un point sur un segment sans déformer la courbe', () => {
    const before = evalSegment({ x: 0, y: 0 }, [{ x: 0, y: 100 }, { x: 100, y: 200 }], { x: 200, y: 200 }, 0.5)
    const { contour, inserted } = splitSegmentAt(cubic, 0, 0.5)
    expect(contour.points[inserted]).toMatchObject({ x: Math.round(before.x), y: Math.round(before.y), type: 'on' })
    expect(toSegs(contour).anchors).toHaveLength(4)
    // la première moitié repasse par le même point au quart de la courbe d'origine
    const q = evalSegment({ x: 0, y: 0 }, [{ x: 0, y: 100 }, { x: 100, y: 200 }], { x: 200, y: 200 }, 0.25)
    const s = toSegs(contour)
    const half = evalSegment(s.anchors[0], s.segs[0], s.anchors[1], 0.5)
    expect(Math.abs(half.x - q.x)).toBeLessThan(1.5)
    expect(Math.abs(half.y - q.y)).toBeLessThan(1.5)
  })

  it('ajoute un point au milieu d’une droite', () => {
    const { contour, inserted } = splitSegmentAt(cubic, 1, 0.5)
    expect(contour.points[inserted]).toMatchObject({ x: 200, y: 100 })
  })

  it('trouve le segment cliqué', () => {
    const hit = hitSegment([cubic], { x: 203, y: 100 }, 10)
    expect(hit).toMatchObject({ c: 0, seg: 1 })
    expect(hit!.t).toBeCloseTo(0.5, 1)
    expect(hitSegment([cubic], { x: 120, y: 60 }, 10)).toBeNull()
  })

  it('convertit un point lisse en angle, puis lui redonne des poignées', () => {
    const smooth: Contour = {
      points: [
        { x: 0, y: 0, type: 'on' },
        { x: 100, y: -50, type: 'off' },
        { x: 150, y: 0, type: 'off' },
        { x: 200, y: 100, type: 'on' },
        { x: 250, y: 200, type: 'off' },
        { x: 100, y: 250, type: 'off' },
        { x: 0, y: 200, type: 'on' },
      ],
    }
    expect(isSmoothPoint(smooth, 3)).toBe(true)
    const corner = convertToCorner(smooth, 3)
    const ci = corner.points.findIndex((p) => p.type === 'on' && p.x === 200 && p.y === 100)
    expect(isSmoothPoint(corner, ci)).toBe(false)
    const back = ensureHandles(corner, ci)!
    expect(back.contour.points[back.inIdx].type).toBe('off')
    expect(back.contour.points[back.outIdx].type).toBe('off')
    expect(back.contour.points[back.anchorIdx]).toMatchObject({ x: 200, y: 100, type: 'on' })
  })

  it('donne des poignées à un angle relié par des droites', () => {
    const sq: Contour = { points: [{ x: 0, y: 0, type: 'on' }, { x: 100, y: 0, type: 'on' }, { x: 100, y: 100, type: 'on' }] }
    const r = ensureHandles(sq, 1)!
    expect(r.contour.points.filter((p) => p.type === 'off')).toHaveLength(4)
    expect(r.contour.points[r.anchorIdx]).toMatchObject({ x: 100, y: 0 })
  })

  it('Plume de courbure : poignées alignées et proportionnées, angles sans poignée', () => {
    const nodes = curvatureNodes([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0, corner: true }], false)
    expect(nodes[0].in).toBeUndefined()
    expect(nodes[1].in && nodes[1].out).toBeTruthy()
    expect(nodes[1].in!.y).toBeCloseTo(nodes[1].out!.y)
    expect(nodes[2].in).toBeUndefined()
    const closed = curvatureNodes([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], true)
    expect(closed.every((p) => p.in && p.out)).toBe(true)
  })
})
