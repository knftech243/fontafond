/**
 * Logique des outils Plume, Pinceau et Sélection sur le plan de travail.
 * Les gestes sont calculés depuis l'état de départ (glissers absolus) puis mémorisés
 * dans l'historique en une seule étape au relâchement.
 */
import { useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from 'react'
import type { Glyph } from '../model/types'
import { useWorkspace } from '../workspace/workspaceContext'
import {
  brushToContour,
  deletePoints,
  dist,
  hitContour,
  hitPoint,
  moveHandle,
  movePoints,
  nodesToContour,
  orientNewContour,
  parseKey,
  pointKey,
  pointsInRect,
  snapValue,
  type BrushSample,
  type PenNode,
  type Vec,
} from './geometry'

interface Args {
  projectId: string
  char: string
  glyph: Glyph
  svgRef: RefObject<SVGSVGElement | null>
  /** Pixels écran par unité de police (dépend du zoom). */
  pxPerUnit: number
  enabled: boolean
}

type DragKind = 'points' | 'handle' | 'advance' | 'pen-handle' | 'marquee' | 'brush'

interface Drag {
  kind: DragKind
  start: Vec
  before: Glyph
  keys: string[]
  key?: string
  base?: string[]
  moved: boolean
  /** Position écran et échelle au départ (la vue se recadre quand la chasse change). */
  clientX?: number
  ppu?: number
}

export interface EditorRenderState {
  draft: PenNode[] | null
  hover: Vec | null
  brush: BrushSample[] | null
  marquee: { a: Vec; b: Vec } | null
}

export function useGlyphEditor({ projectId, char, glyph, svgRef, pxPerUnit, enabled }: Args) {
  const ws = useWorkspace()
  const { tool, toolOptions: opt } = ws
  const [draftState, setDraftState] = useState<{ char: string; nodes: PenNode[] } | null>(null)
  const [hover, setHover] = useState<Vec | null>(null)
  const [brush, setBrush] = useState<BrushSample[] | null>(null)
  const [marquee, setMarquee] = useState<{ a: Vec; b: Vec } | null>(null)
  const drag = useRef<Drag | null>(null)

  const draft = draftState && draftState.char === char && tool === 'pen' ? draftState.nodes : null
  const setDraft = (nodes: PenNode[] | null) => setDraftState(nodes ? { char, nodes } : null)
  const px = (n: number) => n / pxPerUnit

  const toFont = (e: { clientX: number; clientY: number }): Vec => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: pt.x, y: -pt.y }
  }
  const snap = (v: Vec): Vec => (opt.snap ? { x: snapValue(v.x, 10), y: snapValue(v.y, 10) } : { x: Math.round(v.x), y: Math.round(v.y) })
  const snapDelta = (d: number) => (opt.snap ? snapValue(d, 10) : Math.round(d))

  function commitDraft(nodes: PenNode[]) {
    if (nodes.length >= 3) {
      const contour = orientNewContour(glyph.contours, nodesToContour(nodes))
      ws.editGlyph(projectId, char, (g) => ({ ...g, contours: [...g.contours, contour] }))
    }
    setDraft(null)
  }

  const selection = ws.selection(projectId)

  function onPointerDown(e: RPointerEvent<HTMLElement>): boolean {
    if (!enabled || e.button !== 0) return false
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = toFont(e)

    if (tool === 'pen') {
      const nodes = draft ?? []
      if (nodes.length >= 3 && dist(pos, nodes[0]) <= px(10)) {
        commitDraft(nodes)
        return true
      }
      const p = snap(pos)
      setDraft([...nodes, { x: p.x, y: p.y }])
      drag.current = { kind: 'pen-handle', start: p, before: glyph, keys: [], moved: false }
      return true
    }

    if (tool === 'brush') {
      setBrush([{ x: pos.x, y: pos.y, pressure: e.pressure || 0.5 }])
      drag.current = { kind: 'brush', start: pos, before: glyph, keys: [], moved: false }
      return true
    }

    if (tool === 'select') {
      const key = hitPoint(glyph.contours, pos, px(8), opt.showHandles)
      if (key) {
        let keys: string[]
        if (e.shiftKey) keys = selection.includes(key) ? selection.filter((k) => k !== key) : [...selection, key]
        else keys = selection.includes(key) ? selection : [key]
        ws.setSelection(projectId, keys)
        const [c, p] = parseKey(key)
        const isOff = glyph.contours[c].points[p].type === 'off'
        drag.current = { kind: isOff && !e.shiftKey ? 'handle' : 'points', key, start: pos, before: glyph, keys, moved: false }
        return true
      }
      if (Math.abs(pos.x - glyph.advanceWidth) <= px(8)) {
        drag.current = { kind: 'advance', start: pos, before: glyph, keys: [], moved: false, clientX: e.clientX, ppu: pxPerUnit }
        return true
      }
      const ci = hitContour(glyph.contours, pos)
      if (ci !== null) {
        const own = glyph.contours[ci].points.map((_, pi) => pointKey(ci, pi))
        const keys = e.shiftKey ? [...new Set([...selection, ...own])] : own
        ws.setSelection(projectId, keys)
        drag.current = { kind: 'points', start: pos, before: glyph, keys, moved: false }
        return true
      }
      const base = e.shiftKey ? selection : []
      ws.setSelection(projectId, base)
      setMarquee({ a: pos, b: pos })
      drag.current = { kind: 'marquee', start: pos, before: glyph, keys: [], base, moved: false }
      return true
    }
    return false
  }

  function onPointerMove(e: RPointerEvent<HTMLElement>) {
    if (!enabled) return
    const pos = toFont(e)
    setHover(pos)
    const d = drag.current
    if (!d) return
    const dx = pos.x - d.start.x
    const dy = pos.y - d.start.y
    switch (d.kind) {
      case 'pen-handle': {
        if (!draft || dist(pos, d.start) < px(4)) return
        const out = snap(pos)
        const last = { x: d.start.x, y: d.start.y, out, in: { x: 2 * d.start.x - out.x, y: 2 * d.start.y - out.y } }
        setDraft([...draft.slice(0, -1), last])
        d.moved = true
        return
      }
      case 'brush':
        setBrush((b) => (b ? [...b, { x: pos.x, y: pos.y, pressure: e.pressure || 0.5 }] : b))
        d.moved = true
        return
      case 'points':
        d.moved = true
        ws.editGlyph(projectId, char, () => ({ ...d.before, contours: movePoints(d.before.contours, d.keys, snapDelta(dx), snapDelta(dy)) }), false)
        return
      case 'handle':
        if (!d.key) return
        d.moved = true
        ws.editGlyph(projectId, char, () => ({ ...d.before, contours: moveHandle(d.before.contours, d.key!, snap(pos), e.altKey) }), false)
        return
      case 'advance':
        d.moved = true
        {
          const delta = (e.clientX - (d.clientX ?? e.clientX)) / (d.ppu ?? pxPerUnit)
          ws.editGlyph(projectId, char, () => ({ ...d.before, advanceWidth: Math.max(0, d.before.advanceWidth + snapDelta(delta)) }), false)
        }
        return
      case 'marquee':
        setMarquee({ a: d.start, b: pos })
        ws.setSelection(projectId, [...new Set([...(d.base ?? []), ...pointsInRect(glyph.contours, d.start, pos)])])
        return
    }
  }

  function onPointerUp(e: RPointerEvent<HTMLElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.kind === 'brush') {
      const samples = brush ?? []
      setBrush(null)
      const contour = brushToContour(samples, {
        size: opt.brushSize,
        smoothing: opt.smoothing,
        usePressure: opt.pressure && e.pointerType === 'pen',
      })
      if (contour) ws.editGlyph(projectId, char, (g) => ({ ...g, contours: [...g.contours, contour] }))
      return
    }
    if (d.kind === 'marquee') {
      setMarquee(null)
      return
    }
    if ((d.kind === 'points' || d.kind === 'handle' || d.kind === 'advance') && d.moved) ws.recordHistory(projectId, char, d.before)
  }

  /** Raccourcis propres au document actif ; renvoie vrai si la touche a été utilisée. */
  function onKeyDown(e: KeyboardEvent | RKeyboardEvent): boolean {
    if (!enabled) return false
    if (tool === 'pen' && draft) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        commitDraft(draft)
        return true
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        setDraft(draft.length > 1 ? draft.slice(0, -1) : null)
        return true
      }
      return false
    }
    if (tool === 'select' && selection.length > 0) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        ws.editGlyph(projectId, char, (g) => ({ ...g, contours: deletePoints(g.contours, selection) }))
        ws.setSelection(projectId, [])
        return true
      }
      if (e.key === 'Escape') {
        ws.setSelection(projectId, [])
        return true
      }
      const step = e.shiftKey ? 10 : 1
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
      const mv = arrows[e.key]
      if (mv) {
        ws.editGlyph(projectId, char, (g) => ({ ...g, contours: movePoints(g.contours, selection, mv[0], mv[1]) }))
        return true
      }
    }
    return false
  }

  let cursor = 'default'
  if (enabled) {
    if (tool === 'pen') cursor = draft && hover && draft.length >= 3 && dist(hover, draft[0]) <= px(10) ? 'cell' : 'crosshair'
    else if (tool === 'brush') cursor = 'crosshair'
    else if (tool === 'select' && hover && Math.abs(hover.x - glyph.advanceWidth) <= px(8)) cursor = 'ew-resize'
  }

  const render: EditorRenderState = { draft, hover, brush, marquee }
  return { onPointerDown, onPointerMove, onPointerUp, onKeyDown, cursor, render, hasDraft: !!draft }
}
