import type { DockviewApi } from 'dockview-react'
import { createContext, useContext } from 'react'
import type { FontProject } from '../model/types'

export type Tool = 'pen' | 'brush' | 'select' | 'hand' | 'zoom'
export type SaveState = 'saved' | 'saving' | 'error'

/** Vue d'un document : zoom (1 = ajusté à la fenêtre) et décalage en pixels. */
export interface ViewState {
  zoom: number
  x: number
  y: number
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
