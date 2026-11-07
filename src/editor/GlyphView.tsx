import type { ReactNode, Ref } from 'react'
import { contoursToPathData } from '../font/path'
import type { Contour, FontMetrics, Glyph } from '../model/types'

interface GuideDef {
  key: keyof FontMetrics | 'baseline'
  label: string
  color: string
  labelColor: string
  dashed?: boolean
}

const GUIDES: GuideDef[] = [
  { key: 'ascender', label: 'Ascendante', color: '#8aa5a5', labelColor: '#4d6566', dashed: true },
  { key: 'capHeight', label: 'Capitales', color: '#CE1021', labelColor: '#a50d1a' },
  { key: 'xHeight', label: 'Hauteur x', color: '#205A5C', labelColor: '#205A5C' },
  { key: 'baseline', label: 'Ligne de base', color: '#007FFF', labelColor: '#0059b3' },
  { key: 'descender', label: 'Descendante', color: '#8aa5a5', labelColor: '#4d6566', dashed: true },
]

interface GlyphViewProps {
  glyph: Glyph
  metrics: FontMetrics
  /** Calque d'édition (points, poignées…), dessiné en unités de police, y vers le haut. */
  overlay?: ReactNode
  svgRef?: Ref<SVGSVGElement>
  /** Lettre modèle grise en fond, pour décalquer. */
  template?: boolean
  /** Contours affichés en transparence (accent composé automatiquement). */
  ghost?: Contour[]
}

/** Marge autour de la chasse, en unités de police (partagée avec le calque d'édition). */
const GLYPH_PAD = 160

/** Glyphe affiché sur le plan de travail, avec ses lignes guides et sa chasse. */
export function GlyphView({ glyph, metrics, overlay, svgRef, template = true, ghost }: GlyphViewProps) {
  // Tailles d'affichage proportionnelles aux unités par em (1000, 2048…).
  const k = metrics.unitsPerEm / 1000
  const pad = GLYPH_PAD * k
  const adv = glyph.advanceWidth
  const top = metrics.ascender + pad
  const bottom = metrics.descender - pad
  const width = adv + pad * 2
  const height = top - bottom
  const d = contoursToPathData(glyph.contours)
  const value = (k: GuideDef['key']) => (k === 'baseline' ? 0 : metrics[k])

  return (
    <svg
      ref={svgRef}
      className="fd-glyph-view"
      viewBox={`${-pad} ${-top} ${width} ${height}`}
      role="img"
      aria-label={`Glyphe ${glyph.char}, chasse ${adv}`}
    >
      <defs>
        <pattern id="fd-grid" width={50 * k} height={50 * k} patternUnits="userSpaceOnUse">
          <path d={`M${50 * k} 0H0V${50 * k}`} fill="none" stroke="#eceef3" strokeWidth={2 * k} />
        </pattern>
      </defs>
      <rect x={-pad} y={-top} width={width} height={height} fill="var(--fd-paper)" />
      <rect x={-pad} y={-top} width={width} height={height} fill="url(#fd-grid)" />
      <rect x={0} y={-top} width={adv} height={height} fill="#e6f2f2" opacity="0.5" />

      {GUIDES.map((g) => {
        const y = -value(g.key)
        return (
          <g key={g.key}>
            <line
              x1={-pad}
              x2={adv + pad}
              y1={y}
              y2={y}
              stroke={g.color}
              strokeWidth={(g.key === 'baseline' ? 4 : 2.5) * k}
              strokeDasharray={g.dashed ? `${12 * k} ${9 * k}` : undefined}
            />
            <text x={-pad + 12 * k} y={y - 10 * k} fontSize={26 * k} fill={g.labelColor} fontFamily="Inter, sans-serif">
              {g.label} {value(g.key)}
            </text>
          </g>
        )
      })}

      <line x1={0} x2={0} y1={-top} y2={-bottom} stroke="#8aa5a5" strokeWidth={2.5 * k} />
      <line x1={adv} x2={adv} y1={-top} y2={-bottom} stroke="#007FFF" strokeWidth={3 * k} strokeDasharray={`${14 * k} ${8 * k}`} />
      <rect x={adv - 16 * k} y={-metrics.xHeight / 2 - 42 * k} width={32 * k} height={84 * k} rx={9 * k} fill="#F7D618" stroke="#0b1a1b" strokeWidth={3 * k} />
      <text x={adv - 12 * k} y={-bottom - 18 * k} fontSize={26 * k} textAnchor="end" fill="#4d6566" fontFamily="Inter, sans-serif">
        Chasse {adv}
      </text>

      {template && !(ghost && ghost.length) && (
        <text
          x={adv / 2}
          y={-metrics.capHeight / 2 + 120 * k}
          fontSize={Math.round(metrics.capHeight * 0.9)}
          textAnchor="middle"
          fill={d ? '#dfe7e7' : '#c9d6d6'}
          fontFamily="Inter, sans-serif"
          pointerEvents="none"
        >
          {glyph.char}
        </text>
      )}
      {ghost && ghost.length > 0 && (
        <path d={contoursToPathData(ghost)} transform="scale(1,-1)" fill="#205A5C" fillOpacity={0.45} fillRule="nonzero" />
      )}
      {d && <path d={d} transform="scale(1,-1)" fill="var(--fd-ink)" fillRule="nonzero" />}
      {overlay && <g transform="scale(1,-1)">{overlay}</g>}
    </svg>
  )
}

/** Petite vignette pour la grille des glyphes. */
export function GlyphThumb({ glyph, metrics }: { glyph: Glyph; metrics: FontMetrics }) {
  const d = contoursToPathData(glyph.contours)
  if (!d) return <span className="fd-cell-char">{glyph.char}</span>
  const top = metrics.ascender
  const h = metrics.ascender - metrics.descender
  return (
    <svg viewBox={`0 ${-top} ${Math.max(glyph.advanceWidth, 1)} ${h}`} className="fd-cell-svg" aria-hidden="true">
      <path d={d} transform="scale(1,-1)" fill="currentColor" />
    </svg>
  )
}
