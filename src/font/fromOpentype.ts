/** Import : fichier .ttf / .otf / .woff → projet Fontafond modifiable. */
import * as opentype from 'opentype.js'
import { DEFAULT_CHARSET, SPACE, glyphName } from '../model/defaultCharset'
import { createEmptyGlyph, createProject } from '../model/project'
import type { Contour, FontProject, Glyph, KerningPair, Point } from '../model/types'

export class UnsupportedFontError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedFontError'
  }
}

/** Détecte le format d'après les premiers octets du fichier. */
export function sniffFormat(buffer: ArrayBuffer): 'ttf' | 'otf' | 'woff' | 'woff2' | 'inconnu' {
  const b = new Uint8Array(buffer.slice(0, 4))
  const tag = String.fromCharCode(...b)
  if (tag === 'wOF2') return 'woff2'
  if (tag === 'wOFF') return 'woff'
  if (tag === 'OTTO') return 'otf'
  if ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) || tag === 'true') return 'ttf'
  return 'inconnu'
}

/** Commandes de tracé → contours (points « on » et poignées « off »). */
export function commandsToContours(commands: opentype.PathCommand[]): Contour[] {
  const contours: Contour[] = []
  let pts: Point[] = []
  const r = (n: number) => Math.round(n)
  const flush = () => {
    // Le dernier point répète souvent le premier : on le retire.
    if (pts.length > 1) {
      const a = pts[0]
      const z = pts[pts.length - 1]
      if (z.type === 'on' && a.x === z.x && a.y === z.y) pts.pop()
    }
    if (pts.filter((p) => p.type === 'on').length >= 2 && pts.length >= 3) contours.push({ points: pts })
    pts = []
  }
  for (const c of commands) {
    if (c.type === 'M') {
      flush()
      pts.push({ x: r(c.x), y: r(c.y), type: 'on' })
    } else if (c.type === 'L') pts.push({ x: r(c.x), y: r(c.y), type: 'on' })
    else if (c.type === 'Q') pts.push({ x: r(c.x1), y: r(c.y1), type: 'off' }, { x: r(c.x), y: r(c.y), type: 'on' })
    else if (c.type === 'C')
      pts.push({ x: r(c.x1), y: r(c.y1), type: 'off' }, { x: r(c.x2), y: r(c.y2), type: 'off' }, { x: r(c.x), y: r(c.y), type: 'on' })
    else if (c.type === 'Z') flush()
  }
  flush()
  return contours
}

export interface FontInfo {
  family: string
  style: string
  format: string
  glyphCount: number
  unicodeCount: number
  license: string
  licenseUrl: string
  copyright: string
}

export interface ParsedFont {
  info: FontInfo
  font: opentype.Font
}

const MAX_GLYPHS = 2000

/** Lit un fichier de police (sans encore créer le projet) pour afficher ses informations. */
export function readFont(buffer: ArrayBuffer): ParsedFont {
  const format = sniffFormat(buffer)
  if (format === 'woff2')
    throw new UnsupportedFontError(
      'Le format WOFF2 n’est pas encore pris en charge. Utilisez le fichier .ttf ou .otf d’origine de la police (souvent fourni avec), ou convertissez-le en .ttf.',
    )
  if (format === 'inconnu') throw new UnsupportedFontError('Ce fichier n’est pas une police .ttf, .otf ou .woff valide.')
  let font: opentype.Font
  try {
    font = opentype.parse(buffer)
  } catch {
    throw new UnsupportedFontError('Impossible de lire cette police : le fichier est peut-être abîmé.')
  }
  let unicodeCount = 0
  for (let i = 0; i < font.glyphs.length; i++) if (font.glyphs.get(i).unicode !== undefined) unicodeCount++
  const name = (k: string) => (font.getEnglishName(k) ?? '').trim()
  return {
    font,
    info: {
      family: name('fontFamily') || 'Police importée',
      style: name('fontSubfamily') || 'Regular',
      format: format.toUpperCase(),
      glyphCount: font.glyphs.length,
      unicodeCount,
      license: name('license'),
      licenseUrl: name('licenseURL'),
      copyright: name('copyright'),
    },
  }
}

/** Crée le projet à partir d'une police lue par `readFont`. */
export function fontToProject(parsed: ParsedFont, versionName: string, now = Date.now()): { project: FontProject; truncated: boolean } {
  const { font, info } = parsed
  const project = createProject(versionName || `${info.family} (modifiée)`, now)
  const os2 = font.tables.os2 ?? {}
  const upm = font.unitsPerEm
  project.source = 'imported'
  project.familyName = versionName || `${info.family} (modifiée)`
  project.styleName = info.style
  project.metrics = {
    unitsPerEm: upm,
    ascender: Math.round(font.ascender),
    descender: Math.round(Math.min(0, font.descender)),
    capHeight: Math.round(os2.sCapHeight || upm * 0.7),
    xHeight: Math.round(os2.sxHeight || upm * 0.5),
  }
  // Glyphes du jeu par défaut, mis à l'échelle de la police, puis tous ceux de la police.
  const glyphs: Record<string, Glyph> = {}
  for (const c of [SPACE, ...DEFAULT_CHARSET]) {
    const g = createEmptyGlyph(c, now)
    glyphs[c] = { ...g, advanceWidth: Math.round((g.advanceWidth * upm) / 1000) }
  }
  let imported = 0
  let truncated = false
  for (let i = 0; i < font.glyphs.length; i++) {
    const og = font.glyphs.get(i)
    if (og.unicode === undefined) continue
    if (imported >= MAX_GLYPHS) {
      truncated = true
      break
    }
    const codes = og.unicodes?.length ? og.unicodes : [og.unicode]
    for (const code of codes) {
      const char = String.fromCodePoint(code)
      glyphs[char] = {
        char,
        unicode: code,
        name: og.name || glyphName(char),
        advanceWidth: Math.round(og.advanceWidth ?? 0),
        contours: commandsToContours(og.path?.commands ?? []),
        updatedAt: now,
      }
    }
    imported++
  }
  project.glyphs = glyphs
  // Paires de crénage entre les caractères du jeu par défaut (kern ou GPOS).
  const kerning: KerningPair[] = []
  const chars = DEFAULT_CHARSET.filter((c) => font.hasChar(c))
  const otGlyphs = chars.map((c) => font.charToGlyph(c))
  for (let a = 0; a < chars.length; a++)
    for (let b = 0; b < chars.length; b++) {
      let v = 0
      try {
        v = font.getKerningValue(otGlyphs[a], otGlyphs[b])
      } catch {
        v = 0
      }
      // Certaines polices ont un GPOS que la bibliothèque lit mal : on complète avec la table « kern ».
      if (!v) v = font.kerningPairs?.[`${otGlyphs[a].index},${otGlyphs[b].index}`] ?? 0
      if (v) kerning.push({ left: chars[a], right: chars[b], value: Math.round(v) })
    }
  project.kerning = kerning
  return { project, truncated }
}
