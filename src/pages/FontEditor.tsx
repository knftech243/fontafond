import { useEffect, useRef, useState } from 'react'
import { GlyphGrid } from '../editor/GlyphGrid'
import { GlyphView } from '../editor/GlyphView'
import { unicodeLabel } from '../model/defaultCharset'
import { summarize } from '../model/project'
import { getProject, saveProject } from '../model/storage'
import type { FontMetrics, FontProject } from '../model/types'
import { goToProjects } from '../router'
import { AppShell, Panel } from '../ui/AppShell'
import { Icon, type IconName } from '../ui/Icon'

type SaveState = 'saved' | 'saving' | 'error'

const TOOLS: { icon: IconName; label: string; key: string }[] = [
  { icon: 'pen', label: 'Plume', key: 'P' },
  { icon: 'brush', label: 'Pinceau', key: 'B' },
  { icon: 'pointer', label: 'Sélection', key: 'V' },
  { icon: 'hand', label: 'Main', key: 'H' },
  { icon: 'zoom', label: 'Zoom', key: 'Z' },
]

const METRIC_FIELDS: { key: keyof FontMetrics; label: string; min: number; max: number }[] = [
  { key: 'ascender', label: 'Ascendante', min: 100, max: 2000 },
  { key: 'capHeight', label: 'Hauteur des capitales', min: 100, max: 2000 },
  { key: 'xHeight', label: 'Hauteur x', min: 50, max: 2000 },
  { key: 'descender', label: 'Descendante', min: -1000, max: 0 },
]

export function FontEditorPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<FontProject | null | undefined>(undefined)
  const [selected, setSelected] = useState('A')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    getProject(projectId).then(
      (p) => alive && setProject(p ?? null),
      () => alive && setProject(null),
    )
    return () => {
      alive = false
    }
  }, [projectId])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  /** Modifie le projet et l'enregistre (regroupé sur 400 ms pendant la saisie). */
  function update(change: (p: FontProject) => FontProject) {
    if (!project) return
    const next = change(project)
    setProject(next)
    setSaveState('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveProject(next).then(
        () => setSaveState('saved'),
        () => setSaveState('error'),
      )
    }, 400)
  }

  if (project === undefined) {
    return (
      <AppShell>
        <p className="fd-page fd-muted">Chargement de la police…</p>
      </AppShell>
    )
  }

  if (project === null) {
    return (
      <AppShell>
        <div className="fd-page">
          <h1>Police introuvable</h1>
          <p className="fd-muted">Elle a peut-être été supprimée, ou elle a été créée sur un autre appareil.</p>
          <button type="button" className="fd-btn fd-btn-primary" onClick={goToProjects}>
            Retour à mes polices
          </button>
        </div>
      </AppShell>
    )
  }

  const glyph = project.glyphs[selected] ?? Object.values(project.glyphs)[1]
  const stats = summarize(project)
  const setMetric = (key: keyof FontMetrics, value: number) =>
    update((p) => ({ ...p, metrics: { ...p.metrics, [key]: value } }))

  return (
    <AppShell
      nav={
        <nav className="fd-tabs" aria-label="Sections">
          <button type="button" className="fd-tab" onClick={goToProjects}>
            <Icon name="back" size={14} /> Mes polices
          </button>
          <span className="fd-tab" aria-current="page">
            Éditeur
          </span>
        </nav>
      }
      title={
        <>
          {project.name} <span className="fd-strong">· {glyph.char}</span>
        </>
      }
      actions={
        <button type="button" className="fd-btn fd-btn-primary" disabled title="Disponible après les outils de dessin">
          <Icon name="download" /> Exporter .otf
        </button>
      }
      options={
        <span className="fd-muted">
          Choisissez une lettre dans la grille. Les outils Plume et Pinceau arrivent à la prochaine étape.
        </span>
      }
      tools={TOOLS.map((t) => (
        <button
          key={t.icon}
          type="button"
          className="fd-tool"
          disabled
          aria-label={`${t.label} (${t.key}), bientôt disponible`}
          title={`${t.label} (${t.key}) – bientôt`}
        >
          <Icon name={t.icon} size={20} />
        </button>
      ))}
      panels={
        <>
          <Panel
            title="Glyphes"
            aside={
              <span className="fd-muted">
                {stats.drawn} / {stats.total} dessinés
              </span>
            }
          >
            <GlyphGrid glyphs={project.glyphs} metrics={project.metrics} selected={glyph.char} onSelect={setSelected} />
          </Panel>
          <Panel title="Glyphe sélectionné">
            <div className="fd-fields-2">
              <label className="fd-field">
                <span>Chasse</span>
                <input
                  type="number"
                  min={0}
                  max={4000}
                  value={glyph.advanceWidth}
                  onChange={(e) => {
                    const v = Math.max(0, Math.round(Number(e.target.value) || 0))
                    update((p) => ({
                      ...p,
                      glyphs: { ...p.glyphs, [glyph.char]: { ...glyph, advanceWidth: v, updatedAt: Date.now() } },
                    }))
                  }}
                />
              </label>
              <label className="fd-field">
                <span>Unicode</span>
                <input value={unicodeLabel(glyph.char)} readOnly />
              </label>
            </div>
          </Panel>
          <Panel title="Métriques de la police">
            <label className="fd-field">
              <span>Nom de famille (dans le fichier)</span>
              <input
                value={project.familyName}
                maxLength={60}
                onChange={(e) => update((p) => ({ ...p, familyName: e.target.value }))}
              />
            </label>
            <div className="fd-fields-2">
              {METRIC_FIELDS.map((f) => (
                <label key={f.key} className="fd-field">
                  <span>{f.label}</span>
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={project.metrics[f.key]}
                    onChange={(e) => setMetric(f.key, Math.round(Number(e.target.value) || 0))}
                  />
                </label>
              ))}
            </div>
            <p className="fd-muted fd-small">{project.metrics.unitsPerEm} unités par em.</p>
          </Panel>
        </>
      }
      status={
        <>
          <span>
            Glyphe {glyph.char} · {unicodeLabel(glyph.char)}
          </span>
          <span>{project.metrics.unitsPerEm} unités / em</span>
          <span className={`fd-save fd-save-${saveState}`} role="status">
            {saveState === 'saved' && 'Enregistré sur cet appareil'}
            {saveState === 'saving' && 'Enregistrement…'}
            {saveState === 'error' && "Échec de l'enregistrement"}
          </span>
        </>
      }
    >
      <div className="fd-artboard">
        <GlyphView glyph={glyph} metrics={project.metrics} />
      </div>
    </AppShell>
  )
}
