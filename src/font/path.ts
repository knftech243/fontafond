import type { Contour, Point } from '../model/types'

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()
const xy = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`

function segment(offs: Point[], to: Point): string {
  if (offs.length === 0) return `L${xy(to)}`
  if (offs.length === 1) return `Q${xy(offs[0])} ${xy(to)}`
  // 2 poignées (ou plus : on garde la première et la dernière) = cubique
  return `C${xy(offs[0])} ${xy(offs[offs.length - 1])} ${xy(to)}`
}

/**
 * Convertit des contours en attribut `d` SVG, en unités de police (y vers le haut).
 * Pour l'affichage, retourner l'axe y (scale(1,-1)).
 */
export function contoursToPathData(contours: Contour[]): string {
  const parts: string[] = []
  for (const { points } of contours) {
    const start = points.findIndex((p) => p.type === 'on')
    if (start < 0) continue
    // On fait commencer le contour sur un point « on »
    const ordered = [...points.slice(start), ...points.slice(0, start)]
    let d = `M${xy(ordered[0])}`
    let offs: Point[] = []
    for (const p of ordered.slice(1)) {
      if (p.type === 'off') offs.push(p)
      else {
        d += segment(offs, p)
        offs = []
      }
    }
    // Fermeture vers le premier point (éventuellement courbe)
    if (offs.length > 0) d += segment(offs, ordered[0])
    parts.push(d + 'Z')
  }
  return parts.join('')
}
