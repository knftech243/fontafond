import { contoursToPathData } from '../font/path'
import type { Glyph } from '../model/types'
import { isPenTool, type Tool, type ToolOptions } from '../workspace/workspaceContext'
import { brushOutline, dist, parseKey, pointKey, type PenNode, type Vec } from './geometry'
import type { EditorRenderState } from './useGlyphEditor'

interface Props {
  glyph: Glyph
  tool: Tool
  options: ToolOptions
  selection: string[]
  pxPerUnit: number
  state: EditorRenderState
}

const BLUE = '#007FFF'
const INK = '#0b1a1b'

function draftPath(nodes: PenNode[]): string {
  if (nodes.length === 0) return ''
  let d = `M${nodes[0].x} ${nodes[0].y}`
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    if (a.out && b.in) d += `C${a.out.x} ${a.out.y} ${b.in.x} ${b.in.y} ${b.x} ${b.y}`
    else if (a.out || b.in) {
      const c = (a.out ?? b.in)!
      d += `Q${c.x} ${c.y} ${b.x} ${b.y}`
    } else d += `L${b.x} ${b.y}`
  }
  return d
}

/** Calque d'édition : contours, points, poignées, tracé en cours, aperçu du pinceau, cadre de sélection. */
export function EditorLayer({ glyph, tool, options, selection, pxPerUnit, state }: Props) {
  const u = 1 / pxPerUnit // une unité écran (1 px) en unités de police
  const sel = new Set(selection)
  const showPoints = tool === 'select' || isPenTool(tool)
  const { draft, hover, brush, marquee, curv, curvNodes, hoverSeg, hoverKey } = state
  const hovered = hoverKey ? (() => {
    const [c, p] = parseKey(hoverKey)
    return glyph.contours[c]?.points[p] ?? null
  })() : null

  return (
    <g pointerEvents="none">
      {showPoints && glyph.contours.length > 0 && (
        <path d={contoursToPathData(glyph.contours)} fill="none" stroke={BLUE} strokeWidth={1.5 * u} />
      )}

      {showPoints &&
        glyph.contours.map((c, ci) =>
          c.points.map((p, pi) => {
            const n = c.points.length
            const prev = c.points[(pi - 1 + n) % n]
            const next = c.points[(pi + 1) % n]
            const key = pointKey(ci, pi)
            const selected = sel.has(key)
            if (p.type === 'off') {
              if (!options.showHandles) return null
              const anchor = prev.type === 'on' ? prev : next
              return (
                <g key={key}>
                  <line x1={anchor.x} y1={anchor.y} x2={p.x} y2={p.y} stroke={BLUE} strokeWidth={u} />
                  <circle cx={p.x} cy={p.y} r={3.5 * u} fill={selected ? BLUE : '#fff'} stroke={BLUE} strokeWidth={1.5 * u} />
                </g>
              )
            }
            const smooth = prev.type === 'off' && next.type === 'off'
            const fill = selected ? BLUE : '#fff'
            return smooth ? (
              <circle key={key} cx={p.x} cy={p.y} r={4.5 * u} fill={fill} stroke={INK} strokeWidth={1.5 * u} />
            ) : (
              <rect key={key} x={p.x - 4 * u} y={p.y - 4 * u} width={8 * u} height={8 * u} fill={fill} stroke={INK} strokeWidth={1.5 * u} />
            )
          }),
        )}

      {draft && (
        <g>
          <path d={draftPath(draft)} fill="none" stroke={BLUE} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${4 * u}`} />
          {hover && (
            <line
              x1={draft[draft.length - 1].x}
              y1={draft[draft.length - 1].y}
              x2={hover.x}
              y2={hover.y}
              stroke={BLUE}
              strokeOpacity={0.5}
              strokeWidth={u}
              strokeDasharray={`${4 * u} ${4 * u}`}
            />
          )}
          {draft.map((nd, i) => (
            <g key={i}>
              {nd.in && <line x1={nd.x} y1={nd.y} x2={nd.in.x} y2={nd.in.y} stroke={BLUE} strokeWidth={u} />}
              {nd.out && <line x1={nd.x} y1={nd.y} x2={nd.out.x} y2={nd.out.y} stroke={BLUE} strokeWidth={u} />}
              {nd.in && <circle cx={nd.in.x} cy={nd.in.y} r={3 * u} fill="#fff" stroke={BLUE} strokeWidth={u} />}
              {nd.out && <circle cx={nd.out.x} cy={nd.out.y} r={3 * u} fill="#fff" stroke={BLUE} strokeWidth={u} />}
              <rect x={nd.x - 4 * u} y={nd.y - 4 * u} width={8 * u} height={8 * u} fill={i === 0 ? '#F7D618' : '#fff'} stroke={INK} strokeWidth={1.5 * u} />
            </g>
          ))}
          {hover && draft.length >= 3 && dist(hover, draft[0]) <= 10 * u && (
            <circle cx={draft[0].x} cy={draft[0].y} r={9 * u} fill="none" stroke="#F7D618" strokeWidth={2.5 * u} />
          )}
        </g>
      )}

      {curv && curvNodes && (
        <g>
          <path d={draftPath(curv)} fill="none" stroke={BLUE} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${4 * u}`} />
          {curvNodes.map((nd, i) =>
            nd.corner ? (
              <rect key={i} x={nd.x - 4 * u} y={nd.y - 4 * u} width={8 * u} height={8 * u} fill={i === 0 ? '#F7D618' : '#fff'} stroke={INK} strokeWidth={1.5 * u} />
            ) : (
              <circle key={i} cx={nd.x} cy={nd.y} r={4.5 * u} fill={i === 0 ? '#F7D618' : '#fff'} stroke={INK} strokeWidth={1.5 * u} />
            ),
          )}
          {hover && curvNodes.length >= 3 && dist(hover, curvNodes[0]) <= 10 * u && (
            <circle cx={curvNodes[0].x} cy={curvNodes[0].y} r={9 * u} fill="none" stroke="#F7D618" strokeWidth={2.5 * u} />
          )}
        </g>
      )}

      {hoverSeg && (
        <g>
          <circle cx={hoverSeg.x} cy={hoverSeg.y} r={6 * u} fill={BLUE} fillOpacity={0.25} stroke={BLUE} strokeWidth={1.5 * u} />
          <path d={`M${hoverSeg.x - 3 * u} ${hoverSeg.y}H${hoverSeg.x + 3 * u}M${hoverSeg.x} ${hoverSeg.y - 3 * u}V${hoverSeg.y + 3 * u}`} stroke={BLUE} strokeWidth={1.5 * u} />
        </g>
      )}
      {hovered && (
        <circle
          cx={hovered.x}
          cy={hovered.y}
          r={8 * u}
          fill="none"
          stroke={tool === 'deletePoint' ? '#CE1021' : '#F7D618'}
          strokeWidth={2.5 * u}
        />
      )}

      {tool === 'brush' && brush && brush.length > 1 && (
        <path
          d={outlinePath(brushOutline(brush, { size: options.brushSize, smoothing: options.smoothing, usePressure: options.pressure }, false))}
          fill={BLUE}
          fillOpacity={0.35}
        />
      )}
      {tool === 'brush' && hover && (
        <circle cx={hover.x} cy={hover.y} r={options.brushSize / 2} fill="none" stroke={BLUE} strokeWidth={u} strokeDasharray={`${3 * u} ${3 * u}`} />
      )}

      {marquee && (
        <rect
          x={Math.min(marquee.a.x, marquee.b.x)}
          y={Math.min(marquee.a.y, marquee.b.y)}
          width={Math.abs(marquee.a.x - marquee.b.x)}
          height={Math.abs(marquee.a.y - marquee.b.y)}
          fill={BLUE}
          fillOpacity={0.08}
          stroke={BLUE}
          strokeWidth={u}
          strokeDasharray={`${4 * u} ${3 * u}`}
        />
      )}
    </g>
  )
}

function outlinePath(pts: Vec[]): string {
  if (pts.length < 2) return ''
  return `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`
}
