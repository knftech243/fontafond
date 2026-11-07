import type { DockviewApi } from 'dockview-react'
import { createContext, useContext } from 'react'
import type { FontProject, Glyph } from '../model/types'
import type { StudioDoc } from '../text/types'

export type Tool = 'pen' | 'curvature' | 'addPoint' | 'deletePoint' | 'convert' | 'brush' | 'select' | 'text' | 'hand' | 'zoom'

/** Famille d'outils Plume (un seul bouton dans la barre d'outils, comme dans Photoshop). */
export const PEN_TOOLS: Tool[] = ['pen', 'curvature', 'addPoint', 'deletePoint', 'convert']
export const isPenTool = (t: Tool) => PEN_TOOLS.includes(t)
/** Outils qui dessinent ou modifient le glyphe sur le plan de travail. */
export const isDrawTool = (t: Tool) => isPenTool(t) || t === 'brush' || t === 'select'
export type SaveState = 'saved' | 'saving' | 'error'

/** Vue d'un document : zoom (1 = ajusté à la fenêtre) et décalage en pixels. */
export interface ViewState {
  zoom: number
  x: number
  y: number
}

/** Réglages des outils de dessin (barre d'options). */
export interface ToolOptions {
  snap: boolean
  showHandles: boolean
  template: boolean
  brushSize: number
  smoothing: number
  pressure: boolean
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  snap: false,
  showHandles: true,
  template: true,
  brushSize: 70,
  smoothing: 0.5,
  pressure: true,
}

export const FIT_VIEW: ViewState = { zoom: 1, x: 0, y: 0 }
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 8

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export interface WorkspaceValue {
  api: DockviewApi | null
  setApi: (api: DockviewApi) => void
  /** Polices chargées : `null` = introuvable ; clé absente = en cours de chargement. */
  projects: Record<string, FontProject | null>
  loadProject: (id: string) => void
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  selectedChar: (projectId: string) => string
  selectChar: (projectId: string, char: string) => void
  saveState: SaveState
  updateProject: (id: string, change: (p: FontProject) => FontProject) => void
  openProject: (id: string, name: string) => void
  createAndOpen: (name: string) => Promise<void>
  closeProject: (id: string) => void
  onProjectRenamed: (id: string, name: string) => void
  onProjectDeleted: (id: string) => void
  /** Augmente à chaque création/suppression : la liste « Mes polices » se recharge. */
  listVersion: number
  bumpList: () => void
  tool: Tool
  setTool: (t: Tool) => void
  view: (projectId: string) => ViewState
  setView: (projectId: string, change: (v: ViewState) => ViewState) => void
  narrow: boolean
  toolOptions: ToolOptions
  setToolOptions: (patch: Partial<ToolOptions>) => void
  /** Modifie le glyphe en cours ; `record` = une étape d'historique (sinon, geste en cours). */
  editGlyph: (projectId: string, char: string, change: (g: Glyph) => Glyph, record?: boolean) => void
  /** Modifie plusieurs glyphes en une seule étape d'historique (réglages globaux). */
  editGlyphs: (projectId: string, change: (glyphs: Record<string, Glyph>) => Record<string, Glyph>) => void
  /** Termine un geste (glisser) : mémorise l'état d'avant dans l'historique. */
  recordHistory: (projectId: string, char: string, before: Glyph) => void
  undo: (projectId: string) => void
  redo: (projectId: string) => void
  canUndo: (projectId: string) => boolean
  canRedo: (projectId: string) => boolean
  /** Points sélectionnés (clés « contour:point ») du glyphe en cours. */
  selection: (projectId: string) => string[]
  setSelection: (projectId: string, keys: string[]) => void
  /** Documents texte (Studio) chargés : `null` = introuvable ; clé absente = en cours de chargement. */
  studios: Record<string, StudioDoc | null>
  loadStudio: (id: string) => void
  activeStudioId: string | null
  /** Type du document actif : police, document texte, ou aucun. */
  activeKind: 'font' | 'studio' | null
  setActiveDoc: (kind: 'font' | 'studio' | null, id: string | null) => void
  createStudio: (name: string, fontId: string | null) => Promise<void>
  openStudio: (id: string, name: string) => void
  /** Modifie un document texte (enregistré sur l'appareil ; changements rapprochés = une seule annulation). */
  updateStudio: (id: string, change: (d: StudioDoc) => StudioDoc) => void
  undoStudio: (id: string) => void
  redoStudio: (id: string) => void
  canUndoStudio: (id: string) => boolean
  canRedoStudio: (id: string) => boolean
  onStudioDeleted: (id: string) => void
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace doit être utilisé dans <WorkspaceProvider>')
  return ctx
}

/** Zoome en gardant fixe le point (px, py) du conteneur (coordonnées depuis son centre). */
export function zoomAt(v: ViewState, factor: number, px = 0, py = 0): ViewState {
  const zoom = clampZoom(v.zoom * factor)
  const k = zoom / v.zoom
  return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
}
