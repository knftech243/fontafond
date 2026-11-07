import { describe, expect, it } from 'vitest'
import { addRecent, addSaved, loadSwatches, removeSaved } from './swatches'

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
}

describe('nuancier', () => {
  it('garde 10 couleurs récentes sans doublon, la plus récente en premier', () => {
    const s = new MemoryStorage() as unknown as Storage
    let v = loadSwatches(s)
    for (let i = 0; i < 12; i++) v = addRecent(v, `#0000${i.toString(16).padStart(2, '0')}`, s)
    v = addRecent(v, '#000003', s)
    expect(v.recent).toHaveLength(10)
    expect(v.recent[0]).toBe('#000003')
    expect(new Set(v.recent).size).toBe(10)
    expect(loadSwatches(s).recent).toEqual(v.recent)
  })

  it('enregistre et retire des couleurs, ignore les valeurs invalides', () => {
    const s = new MemoryStorage() as unknown as Storage
    let v = addSaved(loadSwatches(s), 'CE1021', s)
    v = addSaved(v, 'pas une couleur', s)
    expect(v.saved).toEqual(['#ce1021'])
    v = removeSaved(v, '#ce1021', s)
    expect(loadSwatches(s).saved).toEqual([])
  })

  it('résiste à un stockage corrompu', () => {
    const s = new MemoryStorage() as unknown as Storage
    s.setItem('fontafond.swatches.v1', '{oups')
    expect(loadSwatches(s)).toEqual({ saved: [], recent: [] })
  })
})
