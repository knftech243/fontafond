import type { IDockviewHeaderActionsProps, IWatermarkPanelProps } from 'dockview-react'
import { useEffect, useState } from 'react'
import { GlyphGrid } from '../editor/GlyphGrid'
import { unicodeLabel } from '../model/defaultCharset'
import { summarize } from '../model/project'
import type { FontMetrics, FontProject } from '../model/types'
import { ProjectsHome } from '../pages/Projects'
import { PanelBody } from '../ui/AppShell'
import { RESET_EVENT, isDocumentPanel } from './positions'
import { useWorkspace } from './workspaceContext'

/** Police du document actif (ou un message si aucune). */
function useActiveProject(): { project: FontProject | null; char: string } {
  const ws = useWorkspace()
  const id = ws.activeProjectId
  const project = id ? (ws.projects[id] ?? null) : null
  return { project, char: id ? ws.selectedChar(id) : 'A' }
}

function NoDocument({ what }: { what: string }) {
  return (
    <PanelBody>
      <p className="fd-empty">Ouvrez ou créez une police pour voir {what}.</p>
    </PanelBody>
  )
}

export function HomePanel() {
  return <ProjectsHome />
}

export function GlyphsPanel() {
  const ws = useWorkspace()
  const { project, char } = useActiveProject()
  if (!project) return <NoDocument what="ses glyphes" />
  const stats = summarize(project)
  return (
    <PanelBody>
      <div className="fd-panel-pad">
        <p className="fd-muted fd-small">
          {stats.drawn} / {stats.total} glyphes dessinés
        </p>
        <GlyphGrid
          glyphs={project.glyphs}
          metrics={project.metrics}
          selected={char}
          onSelect={(c) => ws.selectChar(project.id, c)}
        />
      </div>
    </PanelBody>
  )
}

export function GlyphPanel() {
  const ws = useWorkspace()
  const { project, char } = useActiveProject()
  if (!project) return <NoDocument what="le glyphe sélectionné" />
  const glyph = project.glyphs[char] ?? project.glyphs.A
  return (
    <PanelBody>
      <div className="fd-panel-pad">
        <div className="fd-big-char" aria-hidden="true">
          {glyph.char}
        </div>
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
                ws.updateProject(project.id, (p) => ({
                  ...p,
                  glyphs: { ...p.glyphs, [glyph.char]: { ...p.glyphs[glyph.char], advanceWidth: v, updatedAt: Date.now() } },
                }))
              }}
            />
          </label>
          <label className="fd-field">
            <span>Unicode</span>
            <input value={unicodeLabel(glyph.char)} readOnly />
          </label>
        </div>
      </div>
    </PanelBody>
  )
}

const METRIC_FIELDS: { key: keyof FontMetrics; label: string; min: number; max: number }[] = [
  { key: 'ascender', label: 'Ascendante', min: 100, max: 2000 },
  { key: 'capHeight', label: 'Hauteur des capitales', min: 100, max: 2000 },
  { key: 'xHeight', label: 'Hauteur x', min: 50, max: 2000 },
  { key: 'descender', label: 'Descendante', min: -1000, max: 0 },
]

export function MetricsPanel() {
  const ws = useWorkspace()
  const { project } = useActiveProject()
  if (!project) return <NoDocument what="ses métriques" />
  return (
    <PanelBody>
      <div className="fd-panel-pad">
        <label className="fd-field">
          <span>Nom de famille (dans le fichier)</span>
          <input
            value={project.familyName}
            maxLength={60}
            onChange={(e) => ws.updateProject(project.id, (p) => ({ ...p, familyName: e.target.value }))}
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
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value) || 0)
                  ws.updateProject(project.id, (p) => ({ ...p, metrics: { ...p.metrics, [f.key]: v } }))
                }}
              />
            </label>
          ))}
        </div>
        <p className="fd-muted fd-small">{project.metrics.unitsPerEm} unités par em.</p>
      </div>
    </PanelBody>
  )
}

/** Affiché quand toutes les fenêtres sont fermées. */
export function Watermark(_props: IWatermarkPanelProps) {
  return (
    <div className="fd-watermark">
      <p>Toutes les fenêtres sont fermées.</p>
      <button type="button" className="fd-btn fd-btn-primary" onClick={() => window.dispatchEvent(new Event(RESET_EVENT))}>
        Réinitialiser l'espace de travail
      </button>
    </div>
  )
}

const HEADER_HEIGHT = 34
const savedHeights = new Map<string, number>()

/** Boutons à droite des onglets d'un groupe : replier, détacher/ancrer, agrandir. */
export function GroupActions(props: IDockviewHeaderActionsProps) {
  const ws = useWorkspace()
  const { group, containerApi, panels } = props
  const location = props.location?.type ?? group.api.location.type
  const isDocs = panels.some((p) => isDocumentPanel(p.id))
  const [collapsed, setCollapsed] = useState(() => savedHeights.has(group.id))
  const [maximized, setMaximized] = useState(() => group.api.isMaximized())
  // Replier n'a de sens que si un autre panneau est au-dessus ou au-dessous (sinon il occupe toute la hauteur).
  const fullHeight = () => group.height >= containerApi.height - 4 && !savedHeights.has(group.id)
  const [canCollapse, setCanCollapse] = useState(() => !fullHeight())
  useEffect(() => {
    const d = containerApi.onDidLayoutChange(() => setCanCollapse(!fullHeight()))
    return () => d.dispose()
  })

  const toggleCollapse = () => {
    if (collapsed) {
      group.api.setSize({ height: savedHeights.get(group.id) ?? 300 })
      savedHeights.delete(group.id)
      setCollapsed(false)
    } else {
      savedHeights.set(group.id, Math.max(group.height, 160))
      group.api.setSize({ height: HEADER_HEIGHT })
      setCollapsed(true)
    }
  }

  const toggleFloat = () => {
    if (location === 'floating') {
      group.api.moveTo({ position: isDocs ? 'left' : 'right' })
    } else {
      containerApi.addFloatingGroup(group, {
        width: Math.max(300, Math.min(group.width, 520)),
        height: Math.max(240, Math.min(group.height, 520)),
        x: 80,
        y: 60,
      })
    }
  }

  const toggleMax = () => {
    if (group.api.isMaximized()) group.api.exitMaximized()
    else group.api.maximize()
    setMaximized(group.api.isMaximized())
  }

  return (
    <div className="fd-group-actions">
      {location === 'grid' && !isDocs && !ws.narrow && canCollapse && (
        <button
          type="button"
          className="fd-group-btn"
          aria-label={collapsed ? 'Déplier le panneau' : 'Replier le panneau'}
          title={collapsed ? 'Déplier' : 'Replier'}
          onClick={toggleCollapse}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d={collapsed ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'} />
          </svg>
        </button>
      )}
      {location === 'grid' && isDocs && (
        <button
          type="button"
          className="fd-group-btn"
          aria-label={maximized ? 'Restaurer la taille' : 'Agrandir la fenêtre'}
          title={maximized ? 'Restaurer' : 'Agrandir'}
          onClick={toggleMax}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={maximized ? 'M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5' : 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5'} />
          </svg>
        </button>
      )}
      {!ws.narrow && (
        <button
          type="button"
          className="fd-group-btn"
          aria-label={location === 'floating' ? 'Ancrer la fenêtre' : 'Détacher en fenêtre flottante'}
          title={location === 'floating' ? 'Ancrer' : 'Fenêtre flottante'}
          onClick={toggleFloat}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {location === 'floating' ? (
              <path d="M3 3h18v18H3zM3 9h18" />
            ) : (
              <path d="M8 8h13v13H8zM16 8V3H3v13h5" />
            )}
          </svg>
        </button>
      )}
    </div>
  )
}
