/** Adaptateur : une police de « Mes polices » vue par le moteur de mise en page du Studio. */
import { resolveGlyph } from '../font/composites'
import type { FontProject } from '../model/types'
import type { LayoutFont } from './layout'

export function projectLayoutFont(project: FontProject): LayoutFont {
  const kerning = new Map(project.kerning.map((k) => [`${k.left}\u0000${k.right}`, k.value]))
  const cache = new Map<string, ReturnType<LayoutFont['glyph']>>()
  const m = project.metrics
  return {
    unitsPerEm: m.unitsPerEm,
    ascender: m.ascender,
    descender: m.descender,
    xHeight: m.xHeight,
    glyph: (char) => {
      if (cache.has(char)) return cache.get(char)!
      const r = resolveGlyph(project, char)
      let out: ReturnType<LayoutFont['glyph']> = null
      // Dessiné (ou composé) ; l'espace n'a pas de contour mais existe bien.
      if (r && (r.glyph.contours.length > 0 || /\s/.test(char))) out = { advance: r.glyph.advanceWidth, contours: r.glyph.contours }
      cache.set(char, out)
      return out
    },
    kern: (left, right) => kerning.get(`${left}\u0000${right}`) ?? 0,
  }
}
