/**
 * Accents automatiques : un caractère accentué non dessiné est composé à partir
 * de sa lettre de base et du signe diacritique (é = e + ´).
 */
import { isDrawn } from '../model/project'
import type { Contour, FontProject, Glyph } from '../model/types'

export const MARKS = {
  acute: '´',
  grave: '`',
  circumflex: 'ˆ',
  diaeresis: '¨',
  cedilla: '¸',
  tilde: '˜',
} as const

export const DOTLESS_I = 'ı'

type MarkName = keyof typeof MARKS

interface Composition {
  base: string
  mark: MarkName
}

const C = (base: string, mark: MarkName): Composition => ({ base, mark })

/** Table des compositions (français + quelques voisins). */
export const COMPOSITIONS: Record<string, Composition> = {
  à: C('a', 'grave'), â: C('a', 'circumflex'), ä: C('a', 'diaeresis'), á: C('a', 'acute'), ã: C('a', 'tilde'),
  é: C('e', 'acute'), è: C('e', 'grave'), ê: C('e', 'circumflex'), ë: C('e', 'diaeresis'),
  î: C('i', 'circumflex'), ï: C('i', 'diaeresis'), í: C('i', 'acute'), ì: C('i', 'grave'),
  ô: C('o', 'circumflex'), ö: C('o', 'diaeresis'), ó: C('o', 'acute'), ò: C('o', 'grave'), õ: C('o', 'tilde'),
  ù: C('u', 'grave'), û: C('u', 'circumflex'), ü: C('u', 'diaeresis'), ú: C('u', 'acute'),
  ÿ: C('y', 'diaeresis'), ñ: C('n', 'tilde'), ç: C('c', 'cedilla'),
  À: C('A', 'grave'), Â: C('A', 'circumflex'), Ä: C('A', 'diaeresis'), Á: C('A', 'acute'), Ã: C('A', 'tilde'),
  É: C('E', 'acute'), È: C('E', 'grave'), Ê: C('E', 'circumflex'), Ë: C('E', 'diaeresis'),
  Î: C('I', 'circumflex'), Ï: C('I', 'diaeresis'), Í: C('I', 'acute'),
  Ô: C('O', 'circumflex'), Ö: C('O', 'diaeresis'), Ó: C('O', 'acute'), Õ: C('O', 'tilde'),
  Ù: C('U', 'grave'), Û: C('U', 'circumflex'), Ü: C('U', 'diaeresis'), Ú: C('U', 'acute'),
  Ÿ: C('Y', 'diaeresis'), Ñ: C('N', 'tilde'), Ç: C('C', 'cedilla'),
}

const isUpper = (c: string) => c !== c.toLowerCase()

const translate = (contours: Contour[], dx: number, dy: number): Contour[] =>
  contours.map((c) => ({ points: c.points.map((p) => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy) })) }))

export interface ResolvedGlyph {
  glyph: Glyph
  /** Vrai si le glyphe est composé automatiquement (non dessiné à la main). */
  composite: boolean
  /** Lettres utilisées, ex. « e + ´ ». */
  from?: string
}

/** Base réellement utilisée : « ı » pour î, ï… si elle est dessinée (évite le point de « i »). */
function baseFor(project: FontProject, comp: Composition): Glyph | undefined {
  if (comp.base === 'i' && comp.mark !== 'cedilla') {
    const dotless = project.glyphs[DOTLESS_I]
    if (dotless && isDrawn(dotless)) return dotless
  }
  return project.glyphs[comp.base]
}

/** Composition automatique d'un caractère, ou `null` si impossible (base ou signe non dessinés). */
export function composeGlyph(project: FontProject, char: string): ResolvedGlyph | null {
  const comp = COMPOSITIONS[char]
  const target = project.glyphs[char]
  if (!comp || !target) return null
  const base = baseFor(project, comp)
  const mark = project.glyphs[MARKS[comp.mark]]
  if (!base || !mark || !isDrawn(base) || !isDrawn(mark)) return null
  const m = project.metrics
  // Le signe est dessiné pour les minuscules (au-dessus de la hauteur x) : on le remonte pour les majuscules.
  const dy = comp.mark === 'cedilla' ? 0 : isUpper(char) ? m.capHeight - m.xHeight : 0
  const dx = (base.advanceWidth - mark.advanceWidth) / 2
  return {
    glyph: { ...target, advanceWidth: base.advanceWidth, contours: [...base.contours, ...translate(mark.contours, dx, dy)] },
    composite: true,
    from: `${base.char} + ${mark.char}`,
  }
}

/** Glyphe à utiliser pour l'affichage et l'export : dessiné à la main, sinon composé, sinon vide. */
export function resolveGlyph(project: FontProject, char: string): ResolvedGlyph | null {
  const g = project.glyphs[char]
  if (!g) return null
  if (isDrawn(g)) return { glyph: g, composite: false }
  return composeGlyph(project, char) ?? { glyph: g, composite: false }
}
