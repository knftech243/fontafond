import { existsSync, readFileSync } from 'node:fs'
import * as opentype from 'opentype.js'
import { describe, expect, it } from 'vitest'
import { createProject } from '../model/project'
import type { Contour, FontProject } from '../model/types'
import { composeGlyph, resolveGlyph } from './composites'
import { UnsupportedFontError, commandsToContours, fontToProject, readFont, sniffFormat } from './fromOpentype'
import { adjustAll, adjustGlyph } from './globalAdjust'
import { projectToOtf } from './toOpentype'

const rect = (x: number, y: number, w: number, h: number): Contour => ({
  points: [
    { x, y, type: 'on' },
    { x: x + w, y, type: 'on' },
    { x: x + w, y: y + h, type: 'on' },
    { x, y: y + h, type: 'on' },
  ],
})

function sampleProject(): FontProject {
  const p = createProject('Ma Police Test')
  p.glyphs.A = { ...p.glyphs.A, advanceWidth: 640, contours: [rect(40, 0, 560, 700)] }
  p.glyphs.e = { ...p.glyphs.e, advanceWidth: 520, contours: [rect(40, 0, 440, 500)] }
  p.glyphs.E = { ...p.glyphs.E, advanceWidth: 600, contours: [rect(60, 0, 480, 700)] }
  p.glyphs['´'] = { ...p.glyphs['´'], advanceWidth: 300, contours: [rect(110, 560, 80, 140)] }
  // un « o » avec une courbe (une poignée)
  p.glyphs.o = {
    ...p.glyphs.o,
    advanceWidth: 520,
    contours: [{ points: [{ x: 40, y: 250, type: 'on' }, { x: 260, y: 700, type: 'off' }, { x: 480, y: 250, type: 'on' }, { x: 260, y: -200, type: 'off' }] }],
  }
  return p
}

const toArrayBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer

describe('accents automatiques', () => {
  it('compose é à partir de e et ´, centré', () => {
    const p = sampleProject()
    const r = composeGlyph(p, 'é')!
    expect(r.composite).toBe(true)
    expect(r.from).toBe('e + ´')
    expect(r.glyph.contours).toHaveLength(2)
    expect(r.glyph.advanceWidth).toBe(520)
    // signe centré : (520 - 300) / 2 = 110 de décalage
    expect(r.glyph.contours[1].points[0]).toMatchObject({ x: 220, y: 560 })
  })

  it('remonte le signe pour les majuscules', () => {
    const p = sampleProject()
    const r = composeGlyph(p, 'É')!
    expect(r.glyph.contours[1].points[0].y).toBe(560 + (700 - 500))
  })

  it('ne compose rien si la base ou le signe manque, et préfère le dessin à la main', () => {
    const p = sampleProject()
    expect(composeGlyph(p, 'è')).toBeNull()
    p.glyphs['é'] = { ...p.glyphs['é'], contours: [rect(0, 0, 10, 10)] }
    expect(resolveGlyph(p, 'é')!.composite).toBe(false)
  })
})

describe('export .otf', () => {
  it('produit un fichier relisible avec les glyphes dessinés et composés', () => {
    const p = sampleProject()
    const res = projectToOtf(p)
    expect(res.fileName).toBe('MaPoliceTest-Regular.otf')
    expect(res.exported).toBe(7) // A, E, e, o, ´ + é, É composés
    expect(res.composites).toBe(2)
    const font = opentype.parse(res.buffer)
    expect(font.outlinesFormat).toBe('cff')
    expect(font.getEnglishName('fontFamily')).toBe('Ma Police Test')
    const A = font.charToGlyph('A')
    expect(A.advanceWidth).toBe(640)
    const xs = A.path.commands.filter((c) => c.type !== 'Z').map((c) => (c as { x: number }).x)
    expect(Math.min(...xs)).toBe(40)
    expect(Math.max(...xs)).toBe(600)
    expect(font.hasChar('é')).toBe(true)
    expect(font.hasChar('z')).toBe(false) // non dessiné : exclu
    expect(font.charToGlyph(' ').advanceWidth).toBe(250)
  })

  it('relit le fichier exporté comme un nouveau projet fidèle', () => {
    const p = sampleProject()
    const parsed = readFont(projectToOtf(p).buffer)
    expect(parsed.info.family).toBe('Ma Police Test')
    expect(parsed.info.format).toBe('OTF')
    const { project } = fontToProject(parsed, 'Ma version')
    expect(project.source).toBe('imported')
    expect(project.name).toBe('Ma version')
    expect(project.glyphs.A.contours[0].points.filter((pt) => pt.type === 'on')).toHaveLength(4)
    expect(project.glyphs.A.advanceWidth).toBe(640)
    expect(project.glyphs['é'].contours).toHaveLength(2)
    expect(project.glyphs.z.contours).toHaveLength(0) // présent mais vide
  })
})

describe('import', () => {
  it('convertit les commandes de tracé en contours', () => {
    const c = commandsToContours([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 100, y: 0 },
      { type: 'Q', x1: 150, y1: 50, x: 100, y: 100 },
      { type: 'C', x1: 60, y1: 120, x2: 20, y2: 120, x: 0, y: 100 },
      { type: 'L', x: 0, y: 0 },
      { type: 'Z' },
    ])
    expect(c).toHaveLength(1)
    expect(c[0].points.map((p) => p.type).join(',')).toBe('on,on,off,on,off,off,on')
  })

  it('refuse le WOFF2 avec un message clair', () => {
    const fake = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0]).buffer
    expect(sniffFormat(fake)).toBe('woff2')
    expect(() => readFont(fake)).toThrow(UnsupportedFontError)
  })

  const dejavu = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  it.skipIf(!existsSync(dejavu))('importe une vraie police TrueType (DejaVu Sans)', () => {
    const parsed = readFont(toArrayBuffer(readFileSync(dejavu)))
    expect(parsed.info.family).toBe('DejaVu Sans')
    expect(parsed.info.format).toBe('TTF')
    const { project } = fontToProject(parsed, 'DejaVu Lushi')
    expect(project.metrics.unitsPerEm).toBe(2048)
    expect(project.glyphs.a.contours.length).toBeGreaterThanOrEqual(2)
    expect(project.glyphs.a.contours[0].points.some((p) => p.type === 'off')).toBe(true)
    expect(project.kerning.length).toBeGreaterThan(0)
  })
})

describe('réglages globaux', () => {
  it('incline et ajoute une approche globale', () => {
    const p = sampleProject()
    const g = adjustGlyph(p.glyphs.A, { slant: 45, tracking: 10 })
    expect(g.advanceWidth).toBe(660)
    // point (40, 700) : x + 700 * tan 45° + 10
    expect(g.contours[0].points[3]).toMatchObject({ x: 750, y: 700 })
    const all = adjustAll(p.glyphs, { slant: 10, tracking: 20 })
    expect(all[' '].advanceWidth).toBe(p.glyphs[' '].advanceWidth + 40)
    expect(adjustGlyph(p.glyphs.A, { slant: 0, tracking: 0 })).toBe(p.glyphs.A)
  })
})
