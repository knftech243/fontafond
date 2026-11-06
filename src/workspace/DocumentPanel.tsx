import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { GlyphView } from '../editor/GlyphView'
import { useWorkspace, zoomAt, FIT_VIEW } from './workspaceContext'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/** Fenêtre de document : la lettre en cours sur le plan de travail, avec zoom et déplacement. */
export function DocumentPanel(props: IDockviewPanelProps<{ projectId: string }>) {
  const ws = useWorkspace()
  const { projectId } = props.params
  const { loadProject } = ws
  const project = ws.projects[projectId]
  const view = ws.view(projectId)
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [space, setSpace] = useState(false)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

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

  // Ctrl + molette = zoom autour du curseur ; molette seule = déplacement (comme dans les logiciels de création).
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left - r.width / 2
      const py = e.clientY - r.top - r.height / 2
      if (e.ctrlKey || e.metaKey) ws.setView(projectId, (v) => zoomAt(v, Math.exp(-e.deltaY * 0.0025), px, py))
      else ws.setView(projectId, (v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ws, projectId, project])

  if (project === undefined) return <p className="fd-empty">Chargement de la police…</p>
  if (project === null)
    return (
      <div className="fd-empty">
        <p>Cette police est introuvable : elle a peut-être été supprimée, ou créée sur un autre appareil.</p>
        <button type="button" className="fd-btn" onClick={() => props.api.close()}>
          Fermer l'onglet
        </button>
      </div>
    )

  const glyph = project.glyphs[ws.selectedChar(projectId)] ?? project.glyphs.A
  const pad = 160
  const vbW = glyph.advanceWidth + pad * 2
  const vbH = project.metrics.ascender - project.metrics.descender + pad * 2
  const aspect = vbW / vbH
  const baseW = Math.max(120, Math.min(size.w * 0.9, size.h * 0.9 * aspect))
  const panMode = ws.tool === 'hand' || space

  const point = (e: RPointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { px: e.clientX - r.left - r.width / 2, py: e.clientY - r.top - r.height / 2 }
  }

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (panMode || e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
      setDragging(true)
    } else if (ws.tool === 'zoom' && e.button === 0) {
      const { px, py } = point(e)
      ws.setView(projectId, (v) => zoomAt(v, e.altKey ? 1 / 1.5 : 1.5, px, py))
    }
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    ws.setView(projectId, (v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }))
  }
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  const cursor = panMode ? (dragging ? 'grabbing' : 'grab') : ws.tool === 'zoom' ? 'zoom-in' : 'default'
  const step = (f: number) => ws.setView(projectId, (v) => zoomAt(v, f))

  return (
    <div className="fd-doc">
      <div
        ref={stageRef}
        className="fd-doc-stage"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="fd-doc-content"
          style={{ width: baseW, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          <GlyphView glyph={glyph} metrics={project.metrics} />
        </div>
      </div>
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
