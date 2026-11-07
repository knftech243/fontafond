/** Export : projet Fontafond → fichier OpenType (.otf, contours CFF). */
import * as opentype from 'opentype.js'
import { SPACE } from '../model/defaultCharset'
import { isDrawn } from '../model/project'
import type { Contour, FontProject } from '../model/types'
import { resolveGlyph } from './composites'

/** Contours → chemin opentype.js (une poignée = quadratique convertie en cubique, deux = cubique). */
export function contoursToOtPath(contours: Contour[]): opentype.Path {
  const path = new opentype.Path()
  for (const { points } of contours) {
    const start = points.findIndex((p) => p.type === 'on')
    if (start < 0 || points.length < 2) continue
    const ordered = [...points.slice(start), ...points.slice(0, start)]
    let prev = ordered[0]
    path.moveTo(prev.x, prev.y)
    let offs: typeof ordered = []
    const emit = (to: (typeof ordered)[number]) => {
      if (offs.length === 0) path.lineTo(to.x, to.y)
      else if (offs.length === 1) {
        // Quadratique → cubique exacte (le CFF n'a que des cubiques).
        const q = offs[0]
        path.curveTo(
          prev.x + (2 / 3) * (q.x - prev.x),
          prev.y + (2 / 3) * (q.y - prev.y),
          to.x + (2 / 3) * (q.x - to.x),
          to.y + (2 / 3) * (q.y - to.y),
          to.x,
          to.y,
        )
      } else {
        const c1 = offs[0]
        const c2 = offs[offs.length - 1]
        path.curveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y)
      }
      prev = to
      offs = []
    }
    for (const p of ordered.slice(1)) {
      if (p.type === 'off') offs.push(p)
      else emit(p)
    }
    if (offs.length > 0) emit(ordered[0])
    path.close()
  }
  return path
}

export interface ExportResult {
  buffer: ArrayBuffer
  fileName: string
  exported: number
  total: number
  composites: number
}

const safeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .slice(0, 28) || 'Fontafond'

/** Construit le fichier .otf : .notdef, espace, glyphes dessinés et accents composés. */
export function projectToOtf(project: FontProject): ExportResult {
  const m = project.metrics
  const glyphs: opentype.Glyph[] = [
    new opentype.Glyph({ name: '.notdef', advanceWidth: Math.round(m.unitsPerEm / 2), path: new opentype.Path() }),
  ]
  const space = project.glyphs[SPACE]
  glyphs.push(
    new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: space?.advanceWidth ?? Math.round(m.unitsPerEm / 4), path: new opentype.Path() }),
  )
  let exported = 0
  let composites = 0
  const all = Object.values(project.glyphs).filter((g) => g.char !== SPACE)
  for (const g of all) {
    const r = resolveGlyph(project, g.char)
    if (!r || !isDrawn(r.glyph)) continue
    glyphs.push(
      new opentype.Glyph({
        name: g.name,
        unicode: g.unicode,
        advanceWidth: Math.max(0, Math.round(r.glyph.advanceWidth)),
        path: contoursToOtPath(r.glyph.contours),
      }),
    )
    exported++
    if (r.composite) composites++
  }
  const family = project.familyName.trim() || project.name.trim() || 'Fontafond'
  const font = new opentype.Font({
    familyName: family,
    styleName: project.styleName || 'Regular',
    unitsPerEm: m.unitsPerEm,
    ascender: m.ascender,
    descender: Math.min(0, m.descender),
    glyphs,
    manufacturer: 'Fontafond',
    version: '1.0',
  })
  return {
    buffer: font.toArrayBuffer(),
    fileName: `${safeName(family)}-${safeName(project.styleName || 'Regular')}.otf`,
    exported,
    total: all.length,
    composites,
  }
}
