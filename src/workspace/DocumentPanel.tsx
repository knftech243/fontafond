import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { EditorLayer } from '../editor/EditorLayer'
import { GlyphView } from '../editor/GlyphView'
import { useGlyphEditor } from '../editor/useGlyphEditor'
import { composeGlyph } from '../font/composites'
import { createEmptyGlyph } from '../model/project'
import { FIT_VIEW, isDrawTool, useWorkspace, zoomAt } from './workspaceContext'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

const PAD = 160

/** Fenêtre de document : la lettre en cours sur le plan de travail, avec outils de dessin, zoom et déplacement. */
export function DocumentPanel(props: IDockviewPanelProps<{ projectId: string }>) {
  const ws = useWorkspace()
  const { projectId } = props.params
  const { loadProject } = ws
  const project = ws.projects[projectId]
  const view = ws.view(projectId)
  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [space, setSpace] = useState(false)
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const [panning, setPanning] = useState(false)

  useEffect(() => loadProject(projectId), [loadProject, projectId])

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [project])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        e.preventDefault()
        setSpace(true)
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpace(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Ctrl + molette = zoom autour du curseur ; molette seule = déplacement.
  const setViewRef = useRef(ws.setView)
  useEffect(() => {
    setViewRef.current = ws.setView
  })
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left - r.width / 2
      const py = e.clientY - r.top - r.height / 2
      if (e.ctrlKey || e.metaKey) setViewRef.current(projectId, (v) => zoomAt(v, Math.exp(-e.deltaY * 0.0025), px, py))
      else setViewRef.current(projectId, (v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [projectId, project])

  const char = ws.selectedChar(projectId)
  const glyph = (project && (project.glyphs[char] ?? project.glyphs.A)) || createEmptyGlyph(char)
  const metrics = project?.metrics
  const pad = PAD * ((metrics?.unitsPerEm ?? 1000) / 1000)
  const vbW = glyph.advanceWidth + pad * 2
  const vbH = metrics ? metrics.ascender - metrics.descender + pad * 2 : 1
  const aspect = vbW / vbH
  const baseW = Math.max(120, Math.min(size.w * 0.9, size.h * 0.9 * aspect))
  const pxPerUnit = (baseW * view.zoom) / vbW
  const panMode = ws.tool === 'hand' || space
  const editing = !!project && isDrawTool(ws.tool) && !space

  const editor = useGlyphEditor({ projectId, char, glyph, svgRef, pxPerUnit, enabled: editing })

  // Raccourcis d'édition du document actif (Échap, Entrée, Suppr, flèches).
  const keyRef = useRef(editor.onKeyDown)
  useEffect(() => {
    keyRef.current = editor.onKeyDown
  })
  const isActive = ws.activeProjectId === projectId
  useEffect(() => {
    if (!isActive) return
    const on = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey) return
      if (keyRef.current(e)) e.preventDefault()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [isActive])

  if (project === undefined) return <p className="fd-empty">Chargement de la police…</p>
  if (project === null || !metrics)
    return (
      <div className="fd-empty">
        <p>Cette police est introuvable : elle a peut-être été supprimée, ou créée sur un autre appareil.</p>
        <button type="button" className="fd-btn" onClick={() => props.api.close()}>
          Fermer l'onglet
        </button>
      </div>
    )

  const point = (e: RPointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { px: e.clientX - r.left - r.width / 2, py: e.clientY - r.top - r.height / 2 }
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (panMode || e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId)
      pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
      setPanning(true)
    } else if (ws.tool === 'zoom' && e.button === 0) {
      const { px, py } = point(e)
      ws.setView(projectId, (v) => zoomAt(v, e.altKey ? 1 / 1.5 : 1.5, px, py))
    } else {
      editor.onPointerDown(e)
    }
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = pan.current
    if (d) {
      ws.setView(projectId, (v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }))
      return
    }
    editor.onPointerMove(e)
  }
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (pan.current) {
      pan.current = null
      setPanning(false)
      return
    }
    editor.onPointerUp(e)
  }

  const auto = glyph.contours.length === 0 ? composeGlyph(project, glyph.char) : null
  const cursor = panMode ? (panning ? 'grabbing' : 'grab') : ws.tool === 'zoom' ? 'zoom-in' : editor.cursor
  const step = (f: number) => ws.setView(projectId, (v) => zoomAt(v, f))

  return (
    <div className="fd-doc">
      <div
        ref={stageRef}
        className="fd-doc-stage"
        style={{ cursor }}
        data-testid="plan-de-travail"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="fd-doc-content"
          style={{ width: baseW, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          <GlyphView
            glyph={glyph}
            metrics={metrics}
            svgRef={svgRef}
            template={ws.toolOptions.template}
            ghost={auto?.glyph.contours}
            overlay={
              <EditorLayer
                glyph={glyph}
                tool={ws.tool}
                options={ws.toolOptions}
                selection={ws.selection(projectId)}
                pxPerUnit={pxPerUnit}
                state={editor.render}
              />
            }
          />
        </div>
      </div>
      {auto && (
        <div className="fd-doc-banner" role="status">
          <span>
            <span className="fd-auto-badge">auto</span> « {glyph.char} » est composé automatiquement ({auto.from}). Dessinez ici pour le remplacer, ou :
          </span>
          <button
            type="button"
            className="fd-btn fd-btn-sm"
            onClick={() => ws.editGlyph(projectId, glyph.char, (g) => ({ ...g, advanceWidth: auto.glyph.advanceWidth, contours: auto.glyph.contours }))}
          >
            Décomposer pour modifier
          </button>
        </div>
      )}
      <div className="fd-zoombar" role="group" aria-label="Zoom">
        <button type="button" className="fd-zoom-btn" aria-label="Zoom arrière" onClick={() => step(1 / 1.25)}>
          −
        </button>
        <span className="fd-zoom-value" aria-live="polite">
          {Math.round(view.zoom * 100)} %
        </span>
        <button type="button" className="fd-zoom-btn" aria-label="Zoom avant" onClick={() => step(1.25)}>
          +
        </button>
        <button type="button" className="fd-zoom-fit" onClick={() => ws.setView(projectId, () => FIT_VIEW)}>
          Ajuster
        </button>
      </div>
    </div>
  )
}
