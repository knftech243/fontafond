/**
 * Moteur de mise en page du Studio (fonction pure, en pixels, y vers le bas).
 * Calcule la position de chaque glyphe : taille, approche, crénage, échelles, ligne de base,
 * majuscules / petites capitales, coupure des lignes, alignements, justification, retraits.
 */
import type { Contour } from '../model/types'
import type { CharacterStyle, ParagraphStyle, TextMode } from './types'

export interface LayoutFont {
  unitsPerEm: number
  ascender: number
  descender: number
  xHeight: number
  glyph: (char: string) => { advance: number; contours: Contour[] } | null
  kern: (left: string, right: string) => number
}

export interface LaidGlyph {
  char: string
  /** Origine du glyphe (ligne de base), en pixels depuis le coin haut gauche du bloc. */
  x: number
  y: number
  /** Pixels par unité de police, horizontalement et verticalement (échelles et petites capitales comprises). */
  sx: number
  sy: number
  contours: Contour[]
  /** Glyphe absent de la police : affiché comme un cadre vide. */
  missing: boolean
  width: number
}

export interface Decoration {
  x: number
  y: number
  width: number
  height: number
}

export interface Layout {
  glyphs: LaidGlyph[]
  decorations: Decoration[]
  /** Boîte du texte (pour la sélection et le cadre). */
  width: number
  height: number
  left: number
  lineCount: number
  missing: string[]
}

interface Item {
  char: string
  glyphChar: string
  scale: number
  advance: number
  contours: Contour[]
  missing: boolean
  space: boolean
}

const SMALL_CAPS_RATIO = 0.72
const isLower = (c: string) => c !== c.toUpperCase() && c === c.toLowerCase()

export function lineHeightOf(c: CharacterStyle): number {
  return c.leading ?? c.size * 1.2
}

/** Met le texte en page. `frameWidth` ne sert qu'en texte de paragraphe. */
export function layoutText(
  text: string,
  font: LayoutFont,
  c: CharacterStyle,
  p: ParagraphStyle,
  mode: TextMode,
  frameWidth: number,
): Layout {
  const s = c.size / font.unitsPerEm
  const kx = s * (c.scaleH / 100)
  const ky = s * (c.scaleV / 100)
  const track = (c.tracking / 1000) * c.size
  const lineH = lineHeightOf(c)
  const missing: string[] = []
  const source = c.allCaps ? text.toUpperCase() : text

  const makeItems = (para: string): Item[] => {
    const items: Item[] = []
    let prev: string | null = null
    for (const ch of [...para]) {
      let glyphChar = ch
      let scale = 1
      if (c.smallCaps && isLower(ch)) {
        const up = ch.toUpperCase()
        if (up.length === 1 && font.glyph(up)) {
          glyphChar = up
          scale = SMALL_CAPS_RATIO
        }
      }
      const g = font.glyph(glyphChar)
      const space = /\s/.test(ch)
      const isMissing = !g && !space
      if (isMissing) missing.push(ch)
      const advUnits = g ? g.advance : space ? font.unitsPerEm / 4 : font.unitsPerEm / 2
      const kern = c.kerning === 'metric' && prev !== null ? font.kern(prev, glyphChar) * kx : 0
      // Le crénage s'applique à la lettre précédente : on l'ajoute à l'avance de cette dernière.
      if (kern && items.length) items[items.length - 1].advance += kern
      items.push({ char: ch, glyphChar, scale, advance: advUnits * kx * scale + track, contours: g?.contours ?? [], missing: isMissing, space })
      prev = glyphChar
    }
    return items
  }

  const width = (items: Item[]) => items.reduce((w, it) => w + it.advance, 0)
  const trimEnd = (items: Item[]) => {
    let n = items.length
    while (n > 0 && items[n - 1].space) n--
    return items.slice(0, n)
  }

  /** Coupe un paragraphe en lignes ; en texte de point, une seule ligne. */
  const breakLines = (items: Item[]): Item[][] => {
    if (mode === 'point') return [items]
    const lines: Item[][] = []
    // Mots = suites de caractères + les espaces qui les suivent.
    const words: Item[][] = []
    let cur: Item[] = []
    for (const it of items) {
      if (!it.space && cur.length && cur[cur.length - 1].space) {
        words.push(cur)
        cur = []
      }
      cur.push(it)
    }
    if (cur.length) words.push(cur)
    let line: Item[] = []
    const avail = (first: boolean) => Math.max(1, frameWidth - p.indentLeft - p.indentRight - (first ? p.indentFirst : 0))
    for (const w of words) {
      const max = avail(lines.length === 0)
      if (line.length && width(trimEnd([...line, ...w])) > max) {
        lines.push(line)
        line = []
      }
      // Mot plus long que la ligne : coupé lettre par lettre.
      if (!line.length && width(trimEnd(w)) > avail(lines.length === 0)) {
        let piece: Item[] = []
        for (const it of w) {
          if (piece.length && width(trimEnd([...piece, it])) > avail(lines.length === 0)) {
            lines.push(piece)
            piece = []
          }
          piece.push(it)
        }
        line = piece
        continue
      }
      line.push(...w)
    }
    lines.push(line)
    return lines
  }

  const glyphs: LaidGlyph[] = []
  const decorations: Decoration[] = []
  const ascent = font.ascender * ky
  const descent = -font.descender * ky
  let top = 0
  let lineCount = 0
  let maxRight = 0
  let minLeft = Infinity

  const paragraphs = source.split('\n')
  paragraphs.forEach((para) => {
    top += p.spaceBefore
    const lines = breakLines(makeItems(para))
    lines.forEach((lineItems, li) => {
      const first = li === 0
      const last = li === lines.length - 1
      const items = trimEnd(lineItems)
      const natural = width(items)
      const indent = p.indentLeft + (first ? p.indentFirst : 0)
      const avail = mode === 'paragraph' ? Math.max(0, frameWidth - p.indentLeft - p.indentRight - (first ? p.indentFirst : 0)) : 0
      const justify = p.align.startsWith('justify') && mode === 'paragraph' && (!last || p.align === 'justify-all')
      const lastAlign = p.align === 'justify-center' ? 'center' : p.align === 'justify-right' ? 'right' : p.align.startsWith('justify') ? 'left' : p.align
      let x0 = indent
      let gap = 0
      if (justify) {
        const spaces = items.filter((it) => it.space).length
        if (spaces > 0) gap = (avail - natural) / spaces
      } else if (mode === 'paragraph') {
        if (lastAlign === 'center') x0 += (avail - natural) / 2
        else if (lastAlign === 'right') x0 += avail - natural
      } else {
        // Texte de point : l'alignement se fait autour du point d'ancrage.
        if (lastAlign === 'center') x0 -= natural / 2
        else if (lastAlign === 'right') x0 -= natural
      }
      const baseline = top + ascent
      let x = x0
      for (const it of items) {
        glyphs.push({
          char: it.char,
          x,
          y: baseline - c.baselineShift,
          sx: kx * it.scale,
          sy: ky * it.scale,
          contours: it.contours,
          missing: it.missing,
          width: it.advance - track,
        })
        x += it.advance + (it.space ? gap : 0)
      }
      const lineRight = x - (items.length ? track : 0)
      if (items.length) {
        minLeft = Math.min(minLeft, x0)
        maxRight = Math.max(maxRight, lineRight)
        const thick = Math.max(1, c.size * 0.055)
        if (c.underline) decorations.push({ x: x0, y: baseline + c.size * 0.09 - c.baselineShift, width: lineRight - x0, height: thick })
        if (c.strike)
          decorations.push({ x: x0, y: baseline - font.xHeight * ky * 0.5 - thick / 2 - c.baselineShift, width: lineRight - x0, height: thick })
      }
      top += lineH
      lineCount++
    })
    top += p.spaceAfter
  })
  const height = Math.max(0, top - lineH + ascent + descent - p.spaceAfter)
  return {
    glyphs,
    decorations,
    width: mode === 'paragraph' ? frameWidth : Math.max(0, maxRight - (Number.isFinite(minLeft) ? minLeft : 0)),
    left: mode === 'paragraph' ? 0 : Number.isFinite(minLeft) ? minLeft : 0,
    height,
    lineCount,
    missing: [...new Set(missing)],
  }
}
