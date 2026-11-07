import { describe, expect, it } from 'vitest'
import { EMPTY_HISTORY, changedKeys, pushChange } from './history'
import { createStudio } from './types'

describe('historique du Studio', () => {
  const d0 = createStudio('H', null)
  const withSize = (size: number) => ({ ...d0, char: { ...d0.char, size } })

  it('regroupe un glisser de curseur en une seule étape', () => {
    let h = pushChange(EMPTY_HISTORY, d0, withSize(90), 1000)
    h = pushChange(h, withSize(90), withSize(80), 1200)
    h = pushChange(h, withSize(80), withSize(70), 1500)
    expect(h.past).toHaveLength(1)
    expect(h.past[0].char.size).toBe(96)
  })

  it('sépare deux réglages différents, même rapprochés', () => {
    let h = pushChange(EMPTY_HISTORY, d0, withSize(90), 1000)
    const colored = { ...withSize(90), char: { ...withSize(90).char, color: '#ce1021' } }
    h = pushChange(h, withSize(90), colored, 1100)
    expect(h.past).toHaveLength(2)
    expect(changedKeys(withSize(90), colored)).toBe('char.color')
  })

  it('sépare le même réglage après une pause', () => {
    let h = pushChange(EMPTY_HISTORY, d0, withSize(90), 1000)
    h = pushChange(h, withSize(90), withSize(80), 2000)
    expect(h.past).toHaveLength(2)
  })
})
