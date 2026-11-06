import { describe, expect, it } from 'vitest'
import { contoursToPathData } from './path'

describe('contoursToPathData', () => {
  it('trace des segments droits et ferme le contour', () => {
    const d = contoursToPathData([
      { points: [{ x: 0, y: 0, type: 'on' }, { x: 100, y: 0, type: 'on' }, { x: 50, y: 80, type: 'on' }] },
    ])
    expect(d).toBe('M0 0L100 0L50 80Z')
  })

  it('reconnaît les courbes cubiques et quadratiques, y compris à la fermeture', () => {
    const d = contoursToPathData([
      {
        points: [
          { x: 0, y: 0, type: 'on' },
          { x: 0, y: 50, type: 'off' },
          { x: 50, y: 100, type: 'off' },
          { x: 100, y: 100, type: 'on' },
          { x: 100, y: 0, type: 'off' },
        ],
      },
    ])
    expect(d).toBe('M0 0C0 50 50 100 100 100Q100 0 0 0Z')
  })

  it('commence toujours sur un point « on » et ignore les contours vides', () => {
    const d = contoursToPathData([
      { points: [] },
      { points: [{ x: 5, y: 5, type: 'off' }, { x: 10, y: 0, type: 'on' }, { x: 0, y: 0, type: 'on' }] },
    ])
    expect(d).toBe('M10 0L0 0Q5 5 10 0Z')
  })
})
