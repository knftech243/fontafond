import { useEffect, useState, type CSSProperties } from 'react'
import { listProjects } from '../model/storage'
import type { ProjectSummary } from '../model/types'
import { PanelBody } from '../ui/AppShell'
import { NumberField } from '../ui/NumberField'
import { useWorkspace } from '../workspace/workspaceContext'
import { lineHeightOf } from './layout'
import type { CharacterStyle } from './types'
import { DEFAULT_CHARACTER } from './types'
import { useShowColorPanel } from './useShowColorPanel'
import { useActiveStudio } from './useActiveStudio'

export function NoStudio({ what }: { what: string }) {
  return (
    <PanelBody>
      <p className="fd-empty">Ouvrez ou créez un document texte (Fichier › Nouveau document texte) pour régler {what}.</p>
    </PanelBody>
  )
}


const TOGGLES: { key: keyof CharacterStyle; label: string; text: string; style?: CSSProperties }[] = [
  { key: 'fauxBold', label: 'Faux gras', text: 'T', style: { fontWeight: 800 } },
  { key: 'fauxItalic', label: 'Faux italique', text: 'T', style: { fontStyle: 'italic' } },
  { key: 'allCaps', label: 'Tout en capitales', text: 'TT' },
  { key: 'smallCaps', label: 'Petites capitales', text: 'Tᴛ' },
  { key: 'underline', label: 'Souligné', text: 'T', style: { textDecoration: 'underline' } },
  { key: 'strike', label: 'Barré', text: 'T', style: { textDecoration: 'line-through' } },
]

/** Panneau Caractère, comme dans les logiciels de création. */
export function CharacterPanel() {
  const ws = useWorkspace()
  const { doc, update } = useActiveStudio()
  const [fonts, setFonts] = useState<ProjectSummary[] | null>(null)
  const showColor = useShowColorPanel()
  const { listVersion } = ws

  useEffect(() => {
    let alive = true
    listProjects().then(
      (l) => alive && setFonts(l),
      () => alive && setFonts([]),
    )
    return () => {
      alive = false
    }
  }, [listVersion])

  if (!doc) return <NoStudio what="ses caractères" />
  const c = doc.char
  const set = (patch: Partial<CharacterStyle>) => update((d) => ({ ...d, char: { ...d.char, ...patch } }))
  const known = fonts?.some((f) => f.id === c.fontId)

  return (
    <PanelBody>
      <div className="fd-panel-pad fd-type-panel">
        <label className="fd-field">
          <span>Police</span>
          <select value={c.fontId ?? ''} onChange={(e) => set({ fontId: e.target.value || null })} aria-label="Police">
            {!c.fontId && <option value="">Choisir une police…</option>}
            {c.fontId && fonts && !known && <option value={c.fontId}>(police introuvable)</option>}
            {fonts?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        {fonts?.length === 0 && <p className="fd-muted fd-small">Aucune police : créez-en une ou ouvrez un fichier de police depuis l'Accueil.</p>}

        <div className="fd-num-grid">
          <NumberField label="Taille" abbr="T" value={c.size} min={1} max={2000} unit="px" defaultValue={DEFAULT_CHARACTER.size} onChange={(size) => set({ size })} />
          <div className="fd-num-with">
            <NumberField
              label="Interlignage"
              abbr="IL"
              value={Math.round(lineHeightOf(c) * 10) / 10}
              min={1}
              max={4000}
              unit="px"
              disabled={c.leading === null}
              defaultValue={Math.round(c.size * 1.2)}
              onChange={(leading) => set({ leading })}
            />
            <label className="fd-opt fd-small">
              <input
                type="checkbox"
                checked={c.leading === null}
                onChange={(e) => set({ leading: e.target.checked ? null : Math.round(c.size * 1.2) })}
              />
              Auto
            </label>
          </div>
          <label className="fd-field fd-field-inline">
            <span>
              <span className="fd-num-abbr" aria-hidden="true">
                VA
              </span>
              Crénage
            </span>
            <select value={c.kerning} onChange={(e) => set({ kerning: e.target.value as CharacterStyle['kerning'] })}>
              <option value="metric">Métrique</option>
              <option value="none">0</option>
            </select>
          </label>
          <NumberField label="Approche" abbr="VA" value={c.tracking} min={-1000} max={10000} step={5} unit="‰" defaultValue={0} onChange={(tracking) => set({ tracking })} />
          <NumberField label="Échelle verticale" abbr="↕" value={c.scaleV} min={1} max={1000} unit="%" defaultValue={100} onChange={(scaleV) => set({ scaleV })} />
          <NumberField label="Échelle horizontale" abbr="↔" value={c.scaleH} min={1} max={1000} unit="%" defaultValue={100} onChange={(scaleH) => set({ scaleH })} />
          <NumberField label="Décalage ligne de base" abbr="A↑" value={c.baselineShift} min={-1000} max={1000} unit="px" defaultValue={0} onChange={(baselineShift) => set({ baselineShift })} />
        </div>

        <div className="fd-color-row">
          <span className="fd-muted">Couleur</span>
          <button type="button" className="fd-swatch fd-swatch-lg" style={{ background: c.color }} aria-label={`Couleur du texte ${c.color}, ouvrir le panneau Couleur`} onClick={showColor} />
          <span className="fd-mono">{c.color.toUpperCase()}</span>
        </div>

        <div className="fd-toggle-row" role="group" aria-label="Styles">
          {TOGGLES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="fd-toggle"
              aria-pressed={!!c[t.key]}
              aria-label={t.label}
              title={t.label}
              style={t.style}
              onClick={() => set({ [t.key]: !c[t.key] } as Partial<CharacterStyle>)}
            >
              {t.text}
            </button>
          ))}
        </div>
        <p className="fd-muted fd-small">Astuce : glissez sur le nom d'un réglage pour le changer (Maj = ×10), double-cliquez pour sa valeur par défaut.</p>
      </div>
    </PanelBody>
  )
}
