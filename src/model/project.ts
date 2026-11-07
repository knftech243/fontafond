import { DEFAULT_CHARSET, SPACE, defaultAdvance, glyphName } from './defaultCharset'
import type { FontMetrics, FontProject, Glyph, ProjectSummary } from './types'

export const DEFAULT_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  capHeight: 700,
  xHeight: 500,
}

export function createEmptyGlyph(char: string, now = Date.now()): Glyph {
  return {
    char,
    unicode: char.codePointAt(0) ?? 0,
    name: glyphName(char),
    advanceWidth: defaultAdvance(char),
    contours: [],
    updatedAt: now,
  }
}

function newId(): string {
  return globalThis.crypto.randomUUID()
}

/** Nouveau projet vide avec le jeu de caractères par défaut (+ espace). */
export function createProject(name: string, now = Date.now()): FontProject {
  const cleanName = name.trim() || 'Ma police'
  const glyphs: Record<string, Glyph> = {}
  for (const char of [SPACE, ...DEFAULT_CHARSET]) glyphs[char] = createEmptyGlyph(char, now)
  return {
    version: 1,
    id: newId(),
    name: cleanName,
    familyName: cleanName,
    styleName: 'Regular',
    metrics: { ...DEFAULT_METRICS },
    glyphs,
    kerning: [],
    source: 'scratch',
    createdAt: now,
    updatedAt: now,
  }
}

export function isDrawn(glyph: Glyph): boolean {
  return glyph.contours.some((c) => c.points.length > 0)
}

export function summarize(project: FontProject): ProjectSummary {
  const drawable = Object.values(project.glyphs).filter((g) => g.char !== SPACE)
  return {
    id: project.id,
    name: project.name,
    source: project.source,
    drawn: drawable.filter(isDrawn).length,
    total: drawable.length,
    updatedAt: project.updatedAt,
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Vérifie qu'un objet lu depuis un fichier .json ressemble bien à un projet Fontafond. */
export function isFontProject(value: unknown): value is FontProject {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<FontProject>
  if (p.version !== 1 || typeof p.id !== 'string' || typeof p.name !== 'string') return false
  const m = p.metrics
  if (!m || ![m.unitsPerEm, m.ascender, m.descender, m.capHeight, m.xHeight].every(isNum)) return false
  if (!p.glyphs || typeof p.glyphs !== 'object') return false
  for (const g of Object.values(p.glyphs)) {
    if (!g || typeof g.char !== 'string' || !isNum(g.advanceWidth) || !Array.isArray(g.contours)) return false
    for (const c of g.contours) {
      if (!c || !Array.isArray(c.points)) return false
      for (const pt of c.points) {
        if (!pt || !isNum(pt.x) || !isNum(pt.y) || (pt.type !== 'on' && pt.type !== 'off')) return false
      }
    }
  }
  return Array.isArray(p.kerning ?? [])
}

/** Copie d'un projet importé, avec un nouvel identifiant (évite d'écraser l'existant). */
export function withNewIdentity(project: FontProject, now = Date.now()): FontProject {
  return { ...project, id: newId(), kerning: project.kerning ?? [], updatedAt: now }
}

/** Ajoute à un projet existant les caractères apparus depuis sa création (rien n'est perdu). */
export function withCharset(project: FontProject): FontProject {
  const missing = [SPACE, ...DEFAULT_CHARSET].filter((c) => !project.glyphs[c])
  if (missing.length === 0) return project
  const glyphs = { ...project.glyphs }
  const scale = project.metrics.unitsPerEm / 1000
  for (const c of missing) {
    const g = createEmptyGlyph(c)
    glyphs[c] = { ...g, advanceWidth: Math.round(g.advanceWidth * scale) }
  }
  return { ...project, glyphs }
}
