import { contoursToPathData } from '../font/path'
import type { FontMetrics, Glyph } from '../model/types'

interface Props {
  text: string
  size: number
  metrics: FontMetrics
  /** Glyphe à dessiner pour un caractère (dessiné, composé…), ou `null` s'il n'existe pas. */
  glyphOf: (char: string) => Glyph | null
}

/** Mot écrit avec les glyphes de la police ; les lettres non dessinées restent grises. */
export function WordPreview({ text, size, metrics: m, glyphOf }: Props) {
  let x = 0
  const items = [...text].map((c, i) => {
    const g = glyphOf(c)
    const adv = g ? g.advanceWidth : c === ' ' ? m.unitsPerEm / 4 : m.unitsPerEm / 2
    const item = { key: i, c, x, adv, d: g ? contoursToPathData(g.contours) : '' }
    x += adv
    return item
  })
  const width = Math.max(x, 1)
  const height = m.ascender - m.descender
  return (
    <div className="fd-preview" style={{ height: size + 24 }}>
      <svg
        viewBox={`0 ${-m.ascender} ${width} ${height}`}
        style={{ height: size, width: (size * width) / height }}
        role="img"
        aria-label={`Aperçu du mot « ${text} » avec la police`}
      >
        {items.map((it) =>
          it.d ? (
            <path key={it.key} d={it.d} transform={`translate(${it.x} 0) scale(1,-1)`} fill="var(--fd-ink)" />
          ) : it.c.trim() ? (
            <text key={it.key} x={it.x + it.adv / 2} y={0} fontSize={m.capHeight} textAnchor="middle" fill="#c9d6d6" fontFamily="Inter, sans-serif">
              {it.c}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
