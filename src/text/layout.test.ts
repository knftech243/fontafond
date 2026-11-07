import { describe, expect, it } from 'vitest'
import { layoutText, type LayoutFont } from './layout'
import { DEFAULT_CHARACTER, DEFAULT_PARAGRAPH, type CharacterStyle, type ParagraphStyle } from './types'

// Police d'essai : 1000 unités/em, chaque lettre fait 500 de large, « AV » a un crénage de -100.
const font: LayoutFont = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  xHeight: 500,
  glyph: (c) => (/[A-Za-z]/.test(c) ? { advance: 500, contours: [] } : c === ' ' ? { advance: 250, contours: [] } : null),
  kern: (l, r) => (l === 'A' && r === 'V' ? -100 : 0),
}

const C = (over: Partial<CharacterStyle> = {}): CharacterStyle => ({ ...DEFAULT_CHARACTER, size: 100, ...over })
const P = (over: Partial<ParagraphStyle> = {}): ParagraphStyle => ({ ...DEFAULT_PARAGRAPH, ...over })
const xs = (t: string, c = C(), p = P(), mode: 'point' | 'paragraph' = 'point', w = 1000) =>
  layoutText(t, font, c, p, mode, w).glyphs.map((g) => Math.round(g.x * 100) / 100)

describe('caractère', () => {
  it('place les lettres selon la taille (100 px, 1000 unités/em → 50 px par lettre)', () => {
    expect(xs('AB')).toEqual([0, 50])
  })

  it('applique l’approche en millièmes de cadratin', () => {
    expect(xs('AB', C({ tracking: 100 }))).toEqual([0, 60])
  })

  it('applique le crénage métrique, ou aucun', () => {
    expect(xs('AV')).toEqual([0, 40])
    expect(xs('AV', C({ kerning: 'none' }))).toEqual([0, 50])
  })

  it('applique les échelles et le décalage de ligne de base', () => {
    const l = layoutText('AB', font, C({ scaleH: 200, scaleV: 50, baselineShift: 10 }), P(), 'point', 0)
    expect(l.glyphs[1].x).toBe(100)
    expect(l.glyphs[0].sy).toBeCloseTo(0.05)
    expect(l.glyphs[0].y).toBeCloseTo(800 * 0.05 - 10)
  })

  it('met en majuscules et en petites capitales', () => {
    expect(layoutText('ab', font, C({ allCaps: true }), P(), 'point', 0).glyphs.map((g) => g.char)).toEqual(['A', 'B'])
    const sc = layoutText('Ab', font, C({ smallCaps: true }), P(), 'point', 0)
    expect(sc.glyphs[1].sx).toBeCloseTo(0.1 * 0.72)
    expect(sc.glyphs[0].sx).toBeCloseTo(0.1)
  })

  it('signale les caractères absents de la police', () => {
    const l = layoutText('A1B', font, C(), P(), 'point', 0)
    expect(l.missing).toEqual(['1'])
    expect(l.glyphs[1].missing).toBe(true)
  })

  it('ajoute soulignement et barré', () => {
    const l = layoutText('AB', font, C({ underline: true, strike: true }), P(), 'point', 0)
    expect(l.decorations).toHaveLength(2)
    expect(l.decorations[0].width).toBeCloseTo(100)
  })
})

describe('paragraphe', () => {
  // « AA AA AA » : chaque mot = 100 px, espace = 25 px.
  const T = 'AA AA AA'

  it('coupe les lignes par mots dans le cadre', () => {
    const l = layoutText(T, font, C(), P(), 'paragraph', 230)
    expect(l.lineCount).toBe(3 - 1)
    expect(l.glyphs.filter((g) => g.char === 'A').map((g) => g.y)).toEqual([80, 80, 80, 80, 200, 200])
  })

  it('aligne au centre et à droite dans le cadre', () => {
    expect(xs('AA', C(), P({ align: 'center' }), 'paragraph', 300)[0]).toBe(100)
    expect(xs('AA', C(), P({ align: 'right' }), 'paragraph', 300)[0]).toBe(200)
  })

  it('justifie toutes les lignes sauf la dernière, sauf « tout justifier »', () => {
    const l = layoutText(T, font, C(), P({ align: 'justify-left' }), 'paragraph', 230)
    const line1 = l.glyphs.filter((g) => g.y === 80 && g.char === 'A')
    // 2 mots sur la 1re ligne : le 2e commence à 230 - 100 = 130
    expect(line1[2].x).toBeCloseTo(130)
    const line2 = l.glyphs.filter((g) => g.y === 200 && g.char === 'A')
    expect(line2[0].x).toBe(0)
    const all = layoutText('AA AA', font, C(), P({ align: 'justify-all' }), 'paragraph', 300)
    expect(all.glyphs[3].x).toBeCloseTo(200)
    const c = layoutText(T, font, C(), P({ align: 'justify-center' }), 'paragraph', 230)
    expect(c.glyphs.filter((g) => g.y === 200)[0].x).toBeCloseTo(65)
  })

  it('applique retraits et espaces entre paragraphes', () => {
    const l = layoutText('AA\nAA', font, C(), P({ indentLeft: 10, indentFirst: 20, spaceAfter: 30 }), 'paragraph', 500)
    expect(l.glyphs[0].x).toBe(30)
    expect(l.glyphs[2].x).toBe(30) // nouvelle ligne de paragraphe = première ligne
    expect(l.glyphs[2].y - l.glyphs[0].y).toBe(120 + 30)
  })

  it('centre le texte de point autour de son ancrage', () => {
    expect(xs('AA', C(), P({ align: 'center' }))[0]).toBe(-50)
  })

  it('coupe un mot trop long lettre par lettre', () => {
    const l = layoutText('AAAAAA', font, C(), P(), 'paragraph', 120)
    expect(l.lineCount).toBe(3)
  })
})
