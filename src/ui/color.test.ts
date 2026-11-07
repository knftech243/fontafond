import { describe, expect, it } from 'vitest'
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from './color'

describe('couleurs', () => {
  it('convertit HEX ↔ RVB', () => {
    expect(hexToRgb('#CE1021')).toEqual({ r: 206, g: 16, b: 33 })
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#12')).toBeNull()
    expect(rgbToHex({ r: 32, g: 90, b: 92 })).toBe('#205a5c')
    expect(normalizeHex('007FFF')).toBe('#007fff')
  })

  it('convertit RVB ↔ TSV dans les deux sens', () => {
    expect(rgbToHsv({ r: 0, g: 127, b: 255 })).toEqual({ h: 210, s: 100, v: 100 })
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 })
    for (const hex of ['#ce1021', '#205a5c', '#007fff', '#f7d618']) {
      const back = rgbToHex(hsvToRgb(rgbToHsv(hexToRgb(hex)!)))
      const a = hexToRgb(hex)!
      const b = hexToRgb(back)!
      expect(Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)).toBeLessThanOrEqual(6)
    }
  })
})
