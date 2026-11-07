import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { contoursToPathData } from '../font/path'
import { ZoomStage } from '../ui/ZoomStage'
import { useWorkspace } from '../workspace/workspaceContext'
import { projectLayoutFont } from './fontAdapter'
import { layoutText, lineHeightOf } from './layout'

const ITALIC = Math.tan((12 * Math.PI) / 180)
/** En dessous de cette distance (pixels d'écran), un clic-glisser de l'outil Texte reste un clic. */
const DRAG_MIN = 6

type Gesture =
  | { kind: 'create'; x0: number; y0: number; sx: number; sy: number; x1: number; y1: number; dragging: boolean }
  | { kind: 'move'; dx: number; dy: number }
  | { kind: 'resize'; x0: number; w0: number }

/** Fenêtre de document texte : plan de travail avec le bloc de texte, zone de saisie en bas. */
export function StudioPanel(props: IDockviewPanelProps<{ studioId: string }>) {
  const ws = useWorkspace()
  const { studioId } = props.params
  const { loadStudio, loadProject } = ws
  const doc = ws.studios[studioId]
  const fontId = doc?.char.fontId ?? null
  const project = fontId ? ws.projects[fontId] : null
  const svgRef = useRef<SVGSVGElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => loadStudio(studioId), [loadStudio, studioId])
  useEffect(() => {
    if (fontId) loadProject(fontId)
  }, [loadProject, fontId])

  const font = useMemo(() => (project ? projectLayoutFont(project) : null), [project])
  const layout = useMemo(
    () => (doc && font ? layoutText(doc.text, font, doc.char, doc.para, doc.mode, doc.frameWidth) : null),
    [doc, font],
  )

  if (doc === undefined) return <p className="fd-empty">Chargement du document…</p>
  if (doc === null)
    return (
      <div className="fd-empty">
        <p>Ce document texte est introuvable : il a peut-être été supprimé, ou créé sur un autre appareil.</p>
        <button type="button" className="fd-btn" onClick={() => props.api.close()}>
          Fermer l'onglet
        </button>
      </div>
    )

  const c = doc.char
  const ky = font ? (c.size / font.unitsPerEm) * (c.scaleV / 100) : 0
  const ascent = font ? font.ascender * ky : c.size * 0.8
  const lineH = lineHeightOf(c)
  const update = (change: Parameters<typeof ws.updateStudio>[1]) => ws.updateStudio(studioId, change)

  // Boîte du bloc sur le plan de travail.
  const box = {
    x: doc.x + (layout?.left ?? 0),
    y: doc.y,
    w: doc.mode === 'paragraph' ? doc.frameWidth : Math.max(layout?.width ?? 0, 8),
    h: Math.max(layout?.height ?? 0, lineH),
  }

  /** Point du plan de travail sous le pointeur (zoom et déplacement compris). */
  const toArtboard = (e: RPointerEvent) => {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const inBox = (p: { x: number; y: number }) => p.x >= box.x - 6 && p.x <= box.x + box.w + 6 && p.y >= box.y - 6 && p.y <= box.y + box.h + 6
  const focusText = () => requestAnimationFrame(() => textRef.current?.focus())

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const p = toArtboard(e)
    const onHandle = (e.target as Element).closest?.('[data-handle="frame"]')
    if (onHandle && doc.mode === 'paragraph') {
      gesture.current = { kind: 'resize', x0: p.x, w0: doc.frameWidth }
    } else if (ws.tool === 'select') {
      if (!inBox(p)) return
      gesture.current = { kind: 'move', dx: p.x - doc.x, dy: p.y - doc.y }
    } else if (ws.tool === 'text') {
      gesture.current = { kind: 'create', x0: p.x, y0: p.y, sx: e.clientX, sy: e.clientY, x1: p.x, y1: p.y, dragging: false }
    } else return
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g) return
    const p = toArtboard(e)
    if (g.kind === 'move') update((d) => ({ ...d, x: Math.round(p.x - g.dx), y: Math.round(p.y - g.dy) }))
    else if (g.kind === 'resize') update((d) => ({ ...d, frameWidth: Math.max(40, Math.round(g.w0 + p.x - g.x0)) }))
    else {
      g.x1 = p.x
      g.y1 = p.y
      if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > DRAG_MIN) g.dragging = true
      if (g.dragging) setDraft({ x: Math.min(g.x0, p.x), y: Math.min(g.y0, p.y), w: Math.abs(p.x - g.x0), h: Math.abs(p.y - g.y0) })
    }
  }

  const onPointerUp = () => {
    const g = gesture.current
    gesture.current = null
    setDraft(null)
    if (!g || g.kind !== 'create') return
    if (g.dragging) {
      // Clic-glisser : cadre de texte de paragraphe.
      update((d) => ({
        ...d,
        mode: 'paragraph',
        x: Math.round(Math.min(g.x0, g.x1)),
        y: Math.round(Math.min(g.y0, g.y1)),
        frameWidth: Math.max(40, Math.round(Math.abs(g.x1 - g.x0))),
      }))
    } else if (!inBox({ x: g.x0, y: g.y0 })) {
      // Clic : texte de point, la ligne de base passe par le clic.
      update((d) => ({ ...d, mode: 'point', x: Math.round(g.x0), y: Math.round(g.y0 - ascent) }))
    }
    focusText()
  }

  const showBox = ws.tool === 'text' || ws.tool === 'select'
  const bg = doc.artboard.background
  const W = doc.artboard.width
  const H = doc.artboard.height

  return (
    <div className="fd-studio">
      <ZoomStage
        viewKey={`studio:${studioId}`}
        width={W}
        height={H}
        cursor={ws.tool === 'text' ? 'text' : ws.tool === 'select' ? 'move' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg
          ref={svgRef}
          className="fd-artboard"
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={`Plan de travail : ${doc.text || 'vide'}`}
          data-testid="plan-texte"
        >
          <defs>
            <pattern id={`damier-${studioId}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#ffffff" />
              <rect width="10" height="10" fill="#d9e3e3" />
              <rect x="10" y="10" width="10" height="10" fill="#d9e3e3" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill={bg ?? `url(#damier-${studioId})`} />
          <g opacity={c.opacity} data-testid="texte-rendu">
            {layout?.glyphs.map((g, i) => {
              const x = doc.x + g.x
              const y = doc.y + g.y
              if (g.missing)
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y - ascent * 0.75}
                    width={Math.max(2, g.width)}
                    height={ascent * 0.75}
                    fill="none"
                    stroke={c.color}
                    strokeDasharray="4 3"
                    strokeWidth={Math.max(1, c.size * 0.02)}
                  />
                )
              if (!g.contours.length) return null
              const skew = c.fauxItalic ? ITALIC * g.sy : 0
              return (
                <path
                  key={i}
                  d={contoursToPathData(g.contours)}
                  transform={`matrix(${g.sx} 0 ${skew} ${-g.sy} ${x} ${y})`}
                  fill={c.color}
                  fillRule="nonzero"
                  stroke={c.fauxBold ? c.color : undefined}
                  strokeWidth={c.fauxBold ? (c.size * 0.035) / g.sx : undefined}
                  strokeLinejoin="round"
                />
              )
            })}
            {layout?.decorations.map((d, i) => (
              <rect key={`d${i}`} x={doc.x + d.x} y={doc.y + d.y} width={d.width} height={d.height} fill={c.color} />
            ))}
          </g>
          {showBox && font && (
            <g className="fd-text-box" pointerEvents="none">
              <rect x={box.x} y={box.y} width={box.w} height={box.h} />
              {doc.mode === 'point' && <line x1={doc.x - 6} x2={doc.x + 6} y1={doc.y + ascent} y2={doc.y + ascent} />}
            </g>
          )}
          {font && doc.mode === 'paragraph' && showBox && (
            <rect
              className="fd-frame-handle"
              data-handle="frame"
              x={doc.x + doc.frameWidth - 6}
              y={doc.y + box.h / 2 - 6}
              width={12}
              height={12}
            >
              <title>Glisser pour changer la largeur du cadre</title>
            </rect>
          )}
          {draft && <rect className="fd-text-draft" x={draft.x} y={draft.y} width={draft.w} height={draft.h} />}
        </svg>
      </ZoomStage>
      {!fontId && (
        <div className="fd-doc-banner" role="status">
          Choisissez une police dans le panneau Caractère pour afficher le texte.
        </div>
      )}
      {fontId && project === null && (
        <div className="fd-doc-banner" role="alert">
          La police de ce document est introuvable. Choisissez-en une autre dans le panneau Caractère.
        </div>
      )}
      {layout && layout.missing.length > 0 && (
        <div className="fd-doc-banner" role="status">
          {layout.missing.length} caractère{layout.missing.length > 1 ? 's' : ''} absent{layout.missing.length > 1 ? 's' : ''} de la police
          {' '}({layout.missing.slice(0, 8).join(' ')}{layout.missing.length > 8 ? '…' : ''}) : dessinez-les dans l'éditeur de glyphe.
        </div>
      )}
      <label className="fd-studio-text">
        <span>Texte</span>
        <textarea
          ref={textRef}
          value={doc.text}
          rows={2}
          spellCheck={false}
          placeholder="Tapez votre texte ici (Entrée = nouveau paragraphe)"
          onChange={(e) => {
            const text = e.target.value
            update((d) => ({ ...d, text }))
          }}
        />
      </label>
    </div>
  )
}
