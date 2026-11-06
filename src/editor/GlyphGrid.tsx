import { useMemo, useState } from 'react'
import { CHARSET_GROUPS, unicodeLabel } from '../model/defaultCharset'
import { isDrawn } from '../model/project'
import type { FontMetrics, Glyph } from '../model/types'
import { Icon } from '../ui/Icon'
import { GlyphThumb } from './GlyphView'

interface GlyphGridProps {
  glyphs: Record<string, Glyph>
  metrics: FontMetrics
  selected: string
  onSelect: (char: string) => void
}

const ALL = 'all'

/** Grille des caractères : vides (pointillés), dessinés, ou en cours (jaune). */
export function GlyphGrid({ glyphs, metrics, selected, onSelect }: GlyphGridProps) {
  const [group, setGroup] = useState<string>(ALL)
  const [query, setQuery] = useState('')

  const chars = useMemo(() => {
    const known = new Set(CHARSET_GROUPS.flatMap((g) => g.chars))
    const others = Object.keys(glyphs).filter((c) => c !== ' ' && !known.has(c))
    const base =
      group === ALL
        ? [...CHARSET_GROUPS.flatMap((g) => g.chars), ...others]
        : (CHARSET_GROUPS.find((g) => g.id === group)?.chars ?? [])
    const q = query.trim()
    return base.filter((c) => glyphs[c] && (!q || c === q || unicodeLabel(c).toLowerCase().includes(q.toLowerCase())))
  }, [glyphs, group, query])

  return (
    <div className="fd-glyphgrid">
      <label className="fd-search">
        <Icon name="search" size={14} />
        <span className="fd-sr-only">Rechercher un caractère</span>
        <input
          type="search"
          placeholder="Rechercher un caractère (ex. é)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="fd-chips" role="group" aria-label="Groupes de caractères">
        {[{ id: ALL, label: 'Tous' }, ...CHARSET_GROUPS].map((g) => (
          <button
            key={g.id}
            type="button"
            className="fd-chip"
            aria-pressed={group === g.id}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="fd-cells">
        {chars.map((c) => {
          const g = glyphs[c]
          const state = c === selected ? 'current' : isDrawn(g) ? 'drawn' : 'empty'
          return (
            <button
              key={c}
              type="button"
              className={`fd-cell fd-cell-${state}`}
              aria-pressed={c === selected}
              aria-label={`Glyphe ${c} (${unicodeLabel(c)})${state === 'empty' ? ', vide' : ''}`}
              onClick={() => onSelect(c)}
            >
              <GlyphThumb glyph={g} metrics={metrics} />
            </button>
          )
        })}
        {chars.length === 0 && <p className="fd-muted">Aucun caractère trouvé.</p>}
      </div>
    </div>
  )
}
