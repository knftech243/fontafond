/** Réglages appliqués à toute la police d'un coup : inclinaison et approche globale. */
import { SPACE } from '../model/defaultCharset'
import type { Glyph } from '../model/types'

export interface GlobalAdjust {
  /** Inclinaison en degrés (positif = vers la droite, comme un italique). */
  slant: number
  /** Unités ajoutées à gauche ET à droite de chaque glyphe (approche globale). */
  tracking: number
}

export function adjustGlyph(g: Glyph, a: GlobalAdjust): Glyph {
  const k = Math.tan((a.slant * Math.PI) / 180)
  const t = Math.round(a.tracking)
  if (!k && !t) return g
  return {
    ...g,
    advanceWidth: Math.max(0, g.advanceWidth + 2 * t),
    contours: g.contours.map((c) => ({
      points: c.points.map((p) => ({ ...p, x: Math.round(p.x + p.y * k + t), y: p.y })),
    })),
  }
}

/** Applique le réglage à tous les glyphes ; l'espace ne reçoit que l'approche. */
export function adjustAll(glyphs: Record<string, Glyph>, a: GlobalAdjust): Record<string, Glyph> {
  const out: Record<string, Glyph> = {}
  for (const [c, g] of Object.entries(glyphs)) out[c] = c === SPACE ? adjustGlyph(g, { slant: 0, tracking: a.tracking }) : adjustGlyph(g, a)
  return out
}
