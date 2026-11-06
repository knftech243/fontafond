import { describe, expect, it } from 'vitest'
import { CHARSET_GROUPS, DEFAULT_CHARSET, defaultAdvance, glyphName, unicodeLabel } from './defaultCharset'

describe('jeu de caractères par défaut', () => {
  it("n'a pas de doublon et contient les groupes attendus", () => {
    expect(new Set(DEFAULT_CHARSET).size).toBe(DEFAULT_CHARSET.length)
    expect(CHARSET_GROUPS.map((g) => g.id)).toEqual(['upper', 'lower', 'digits', 'punct', 'accents'])
  })

  it('contient les lettres accentuées du français', () => {
    for (const c of 'éèêàçùœÉÈÇŒ') expect(DEFAULT_CHARSET).toContain(c)
  })

  it('donne des noms de glyphe valides', () => {
    expect(glyphName('A')).toBe('A')
    expect(glyphName(' ')).toBe('space')
    expect(glyphName('é')).toBe('uni00E9')
    expect(unicodeLabel('D')).toBe('U+0044')
  })

  it('propose une chasse par type de caractère', () => {
    expect(defaultAdvance('A')).toBeGreaterThan(defaultAdvance('a'))
    expect(defaultAdvance(' ')).toBe(250)
  })
})
