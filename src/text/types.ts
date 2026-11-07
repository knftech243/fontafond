/** Document texte du Studio : un bloc de texte mis en forme avec une police de « Mes polices ». */

export type Align = 'left' | 'center' | 'right' | 'justify-left' | 'justify-center' | 'justify-right' | 'justify-all'
export type TextMode = 'point' | 'paragraph'

export interface CharacterStyle {
  /** Police de « Mes polices » (id du projet), ou null tant qu'aucune n'est choisie. */
  fontId: string | null
  /** Taille en pixels. */
  size: number
  /** Interlignage en pixels ; null = automatique (120 % de la taille). */
  leading: number | null
  kerning: 'metric' | 'none'
  /** Approche en millièmes de cadratin (comme Photoshop). */
  tracking: number
  /** Échelles horizontale et verticale en %. */
  scaleH: number
  scaleV: number
  /** Décalage de la ligne de base en pixels (positif = vers le haut). */
  baselineShift: number
  fauxBold: boolean
  fauxItalic: boolean
  allCaps: boolean
  smallCaps: boolean
  underline: boolean
  strike: boolean
  /** Couleur du texte (#rrggbb) et opacité (0 à 1). */
  color: string
  opacity: number
}

export interface ParagraphStyle {
  align: Align
  indentLeft: number
  indentRight: number
  indentFirst: number
  spaceBefore: number
  spaceAfter: number
}

export interface StudioDoc {
  version: 1
  id: string
  name: string
  text: string
  mode: TextMode
  /** Position du bloc sur le plan de travail (coin haut gauche ; ancrage pour le texte de point). */
  x: number
  y: number
  /** Largeur du cadre en texte de paragraphe. */
  frameWidth: number
  char: CharacterStyle
  para: ParagraphStyle
  artboard: { width: number; height: number; background: string | null }
  createdAt: number
  updatedAt: number
}

export const DEFAULT_CHARACTER: CharacterStyle = {
  fontId: null,
  size: 96,
  leading: null,
  kerning: 'metric',
  tracking: 0,
  scaleH: 100,
  scaleV: 100,
  baselineShift: 0,
  fauxBold: false,
  fauxItalic: false,
  allCaps: false,
  smallCaps: false,
  underline: false,
  strike: false,
  color: '#0b1a1b',
  opacity: 1,
}

export const DEFAULT_PARAGRAPH: ParagraphStyle = {
  align: 'left',
  indentLeft: 0,
  indentRight: 0,
  indentFirst: 0,
  spaceBefore: 0,
  spaceAfter: 0,
}

export function createStudio(name: string, fontId: string | null, now = Date.now()): StudioDoc {
  return {
    version: 1,
    id: globalThis.crypto.randomUUID(),
    name: name.trim() || 'Sans titre',
    text: 'Bonjour Lubumbashi',
    mode: 'point',
    x: 100,
    y: 120,
    frameWidth: 800,
    char: { ...DEFAULT_CHARACTER, fontId },
    para: { ...DEFAULT_PARAGRAPH },
    artboard: { width: 1200, height: 800, background: '#ffffff' },
    createdAt: now,
    updatedAt: now,
  }
}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

export function isStudioDoc(v: unknown): v is StudioDoc {
  if (!v || typeof v !== 'object') return false
  const d = v as Partial<StudioDoc>
  return (
    d.version === 1 &&
    typeof d.id === 'string' &&
    typeof d.text === 'string' &&
    !!d.char &&
    isNum(d.char.size) &&
    !!d.para &&
    typeof d.para.align === 'string' &&
    !!d.artboard &&
    isNum(d.artboard.width)
  )
}

/** Complète un document enregistré avec les réglages ajoutés depuis (aucune perte). */
export function normalizeStudio(d: StudioDoc): StudioDoc {
  return { ...d, char: { ...DEFAULT_CHARACTER, ...d.char }, para: { ...DEFAULT_PARAGRAPH, ...d.para } }
}
