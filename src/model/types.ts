/**
 * Modèle de données d'un projet de police.
 * Coordonnées en unités de police (1000 par em par défaut), axe y vers le HAUT,
 * ligne de base à y = 0 (même convention que les fichiers .otf/.ttf).
 */

/** Point d'un contour : « on » = sur la courbe, « off » = poignée de Bézier. */
export type PointType = 'on' | 'off'

export interface Point {
  x: number
  y: number
  type: PointType
}

/**
 * Un contour fermé. Entre deux points « on » : 0 poignée = segment droit,
 * 1 poignée = courbe quadratique, 2 poignées = courbe cubique.
 */
export interface Contour {
  points: Point[]
}

export interface Glyph {
  char: string
  unicode: number
  name: string
  /** Chasse : largeur totale réservée à la lettre. */
  advanceWidth: number
  contours: Contour[]
  updatedAt: number
}

export interface KerningPair {
  left: string
  right: string
  value: number
}

export interface FontMetrics {
  unitsPerEm: number
  ascender: number
  descender: number
  capHeight: number
  xHeight: number
}

export type ProjectSource = 'scratch' | 'imported'

export interface FontProject {
  version: 1
  id: string
  /** Nom affiché dans « Mes polices ». */
  name: string
  /** Nom de famille écrit dans le fichier de police exporté. */
  familyName: string
  styleName: string
  metrics: FontMetrics
  glyphs: Record<string, Glyph>
  kerning: KerningPair[]
  source: ProjectSource
  createdAt: number
  updatedAt: number
}

/** Résumé léger pour la liste des projets. */
export interface ProjectSummary {
  id: string
  name: string
  source: ProjectSource
  drawn: number
  total: number
  updatedAt: number
}
