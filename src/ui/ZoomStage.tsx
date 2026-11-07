import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { FIT_VIEW, useWorkspace, zoomAt } from '../workspace/workspaceContext'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

interface Props {
  /** Clé de la vue mémorisée (zoom, déplacement). */
  viewKey: string
  /** Taille naturelle du contenu en pixels (le plan de travail). */
  width: number
  height: number
  /** Gestes laissés au document (outils autres que Main et Zoom). */
  onPointerDown?: (e: RPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: RPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: RPointerEvent<HTMLDivElement>) => void
  cursor?: string
  children: ReactNode
}

/** Plan de travail zoomable et déplaçable (mêmes gestes que l'éditeur de glyphe). */
export function ZoomStage({ viewKey, width, height, onPointerDown, onPointerMove, onPointerUp, cursor, children }: Props) {
  const ws = useWorkspace()
  const view = ws.view(viewKey)
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [space, setSpace] = useState(false)
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const [panning, setPanning] = useState(false)
  const setViewRef = useRef(ws.setView)
  useEffect(() => {
    setViewRef.current = ws.setView
  })

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left - r.width / 2
      const py = e.clientY - r.top - r.height / 2
      if (e.ctrlKey || e.metaKey) setViewRef.current(viewKey, (v) => zoomAt(v, Math.exp(-e.deltaY * 0.0025), px, py))
      else setViewRef.current(viewKey, (v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [viewKey])

  const fit = Math.max(0.05, Math.min((size.w * 0.92) / width, (size.h * 0.92) / height))
  const panMode = ws.tool === 'hand' || space

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (panMode || e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId)
      pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
      setPanning(true)
    } else if (ws.tool === 'zoom' && e.button === 0) {
      const r = stageRef.current!.getBoundingClientRect()
      ws.setView(viewKey, (v) => zoomAt(v, e.altKey ? 1 / 1.5 : 1.5, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2))
    } else onPointerDown?.(e)
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = pan.current
    if (d) ws.setView(viewKey, (v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }))
    else onPointerMove?.(e)
  }
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    if (pan.current) {
      pan.current = null
      setPanning(false)
    } else onPointerUp?.(e)
  }

  const step = (f: number) => ws.setView(viewKey, (v) => zoomAt(v, f))
  const shownCursor = panMode ? (panning ? 'grabbing' : 'grab') : ws.tool === 'zoom' ? 'zoom-in' : (cursor ?? 'default')

  return (
    <div className="fd-doc">
      <div
        ref={stageRef}
        className="fd-doc-stage"
        style={{ cursor: shownCursor }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div
          className="fd-doc-content"
          style={{ width: width * fit, height: height * fit, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          {children}
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
        <button type="button" className="fd-zoom-fit" onClick={() => ws.setView(viewKey, () => FIT_VIEW)}>
          Ajuster
        </button>
      </div>
    </div>
  )
}
