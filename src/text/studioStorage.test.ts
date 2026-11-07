import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createProject } from '../model/project'
import { projectLayoutFont } from './fontAdapter'
import { resetColors, swapColors } from './colorActions'
import { deleteStudio, getStudio, listStudios, saveStudio } from './studioStorage'
import { createStudio } from './types'

describe('documents texte', () => {
  it('enregistre, liste, relit et supprime un document', async () => {
    const a = await saveStudio(createStudio('Affiche', null, 1))
    const b = await saveStudio({ ...createStudio('Carte', 'police-1', 2), text: 'Salut' })
    const list = await listStudios()
    expect(list.map((d) => d.id)).toEqual([b.id, a.id])
    const back = await getStudio(b.id)
    expect(back?.text).toBe('Salut')
    expect(back?.char.fontId).toBe('police-1')
    await deleteStudio(a.id)
    expect((await listStudios()).map((d) => d.id)).toEqual([b.id])
  })

  it('complète un ancien document avec les réglages par défaut', async () => {
    const d = createStudio('Ancien', null)
    const { smallCaps: _s, ...char } = d.char
    void _s
    await saveStudio({ ...d, char: char as typeof d.char })
    expect((await getStudio(d.id))?.char.smallCaps).toBe(false)
  })

  it('inverse et réinitialise les couleurs (X et D)', () => {
    const d = { ...createStudio('C', null), artboard: { width: 10, height: 10, background: null } }
    const swapped = swapColors({ ...d, char: { ...d.char, color: '#ce1021' } })
    expect(swapped.char.color).toBe('#ffffff')
    expect(swapped.artboard.background).toBe('#ce1021')
    const reset = resetColors(swapped)
    expect([reset.char.color, reset.artboard.background]).toEqual(['#000000', '#ffffff'])
  })

  it('adapte une police : glyphes dessinés, espace, absents et crénage', () => {
    const p = createProject('Test')
    p.glyphs.A = { ...p.glyphs.A, advanceWidth: 600, contours: [{ points: [{ x: 0, y: 0, type: 'on' }, { x: 300, y: 700, type: 'on' }, { x: 600, y: 0, type: 'on' }] }] }
    p.kerning = [{ left: 'A', right: 'V', value: -80 }]
    const f = projectLayoutFont(p)
    expect(f.glyph('A')?.advance).toBe(600)
    expect(f.glyph(' ')).not.toBeNull()
    expect(f.glyph('B')).toBeNull()
    expect(f.kern('A', 'V')).toBe(-80)
    expect(f.kern('V', 'A')).toBe(0)
  })
})
