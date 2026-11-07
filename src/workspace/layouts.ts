/**
 * Dispositions de l'espace de travail : sauvegarde de la disposition courante
 * et des espaces de travail enregistrés par l'utilisateur (localStorage).
 * Fonctions pures et testables : aucune dépendance à dockview à l'exécution.
 */
import type { SerializedDockview } from 'dockview-react'

/** Composants de panneau connus (clés de `components` dans Workspace.tsx). */
export const DOCUMENT_COMPONENT = 'document'
export const HOME_COMPONENT = 'home'
export const HOME_PANEL_ID = 'home'
export const HOME_TITLE = 'Accueil'

export type ToolPanelId = 'glyphs' | 'glyph' | 'metrics' | 'preview'

export const TOOL_PANELS: { id: ToolPanelId; title: string }[] = [
  { id: 'glyphs', title: 'Glyphes' },
  { id: 'glyph', title: 'Glyphe sélectionné' },
  { id: 'metrics', title: 'Métriques' },
  { id: 'preview', title: 'Aperçu' },
]

export type PresetId = 'essentiel' | 'dessin'

export const PRESETS: { id: PresetId; name: string }[] = [
  { id: 'essentiel', name: 'Essentiel' },
  { id: 'dessin', name: 'Dessin' },
]

export const documentPanelId = (projectId: string) => `doc:${projectId}`
export const projectIdFromPanelId = (panelId: string) => (panelId.startsWith('doc:') ? panelId.slice(4) : null)

const CURRENT_KEY = 'fontafond.layout.v1'
const CUSTOM_KEY = 'fontafond.workspaces.v1'
const ACTIVE_KEY = 'fontafond.workspace.active.v1'

export interface CustomWorkspace {
  name: string
  layout: SerializedDockview
  savedAt: number
}

function defaultStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function read(store: Storage | null, key: string): unknown {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : undefined
  } catch {
    return undefined
  }
}

function write(store: Storage | null, key: string, value: unknown): boolean {
  try {
    if (!store) return false
    store.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Vérification minimale de la forme d'une disposition enregistrée. */
export function isSerializedDockview(v: unknown): v is SerializedDockview {
  if (!v || typeof v !== 'object') return false
  const d = v as Partial<SerializedDockview>
  return (
    !!d.grid &&
    typeof d.grid === 'object' &&
    !!d.grid.root &&
    typeof d.panels === 'object' &&
    d.panels !== null &&
    Object.keys(d.panels).length > 0
  )
}

export function loadCurrentLayout(store = defaultStore()): SerializedDockview | null {
  const v = read(store, CURRENT_KEY)
  return isSerializedDockview(v) ? v : null
}

export function saveCurrentLayout(layout: SerializedDockview, store = defaultStore()): boolean {
  return write(store, CURRENT_KEY, layout)
}

export function clearCurrentLayout(store = defaultStore()): void {
  try {
    store?.removeItem(CURRENT_KEY)
  } catch {
    // rien à faire
  }
}

export function loadCustomWorkspaces(store = defaultStore()): CustomWorkspace[] {
  const v = read(store, CUSTOM_KEY)
  if (!Array.isArray(v)) return []
  return v.filter(
    (w): w is CustomWorkspace =>
      !!w && typeof w === 'object' && typeof (w as CustomWorkspace).name === 'string' && isSerializedDockview((w as CustomWorkspace).layout),
  )
}

/** Enregistre (ou remplace, si le nom existe déjà) un espace de travail, sans les documents ouverts. */
export function saveCustomWorkspace(name: string, layout: SerializedDockview, store = defaultStore(), now = Date.now()): CustomWorkspace[] {
  const clean = name.trim()
  if (!clean) return loadCustomWorkspaces(store)
  const others = loadCustomWorkspaces(store).filter((w) => w.name.toLowerCase() !== clean.toLowerCase())
  const list = [...others, { name: clean, layout: stripDocuments(layout), savedAt: now }]
  write(store, CUSTOM_KEY, list)
  return list
}

export function deleteCustomWorkspace(name: string, store = defaultStore()): CustomWorkspace[] {
  const list = loadCustomWorkspaces(store).filter((w) => w.name !== name)
  write(store, CUSTOM_KEY, list)
  return list
}

/** Espace de travail actif : `preset:essentiel` ou `custom:<nom>`. */
export function loadActiveWorkspace(store = defaultStore()): string {
  const v = read(store, ACTIVE_KEY)
  return typeof v === 'string' ? v : 'preset:essentiel'
}

export function saveActiveWorkspace(id: string, store = defaultStore()): void {
  write(store, ACTIVE_KEY, id)
}

interface GroupLike {
  id: string
  views: string[]
  activeView?: string
}

const isGroupLike = (v: unknown): v is GroupLike =>
  !!v && typeof v === 'object' && Array.isArray((v as GroupLike).views) && typeof (v as GroupLike).id === 'string'

/**
 * Retire les documents d'une disposition (un espace de travail ne mémorise que les panneaux,
 * comme dans Photoshop) : le premier groupe qui contenait des documents reçoit l'onglet « Accueil »,
 * où les documents ouverts seront replacés.
 */
export function stripDocuments(layout: SerializedDockview): SerializedDockview {
  const copy = JSON.parse(JSON.stringify(layout)) as SerializedDockview
  const isDoc = (id: string) => {
    const p = copy.panels[id]
    return !p || p.contentComponent === DOCUMENT_COMPONENT || p.contentComponent === HOME_COMPONENT
  }
  let homePlaced = false

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (!node || typeof node !== 'object') return
    if (isGroupLike(node)) {
      const hadDocs = node.views.some(isDoc)
      if (hadDocs) {
        node.views = node.views.filter((id) => !isDoc(id))
        if (!homePlaced) {
          node.views.unshift(HOME_PANEL_ID)
          homePlaced = true
        }
        if (!node.activeView || !node.views.includes(node.activeView)) node.activeView = node.views[0]
      }
      return
    }
    for (const [k, v] of Object.entries(node)) if (k !== 'panels') visit(v)
  }
  visit(copy.grid)
  visit(copy.floatingGroups)

  const panels: SerializedDockview['panels'] = {}
  for (const [id, p] of Object.entries(copy.panels)) if (!isDoc(id)) panels[id] = p
  if (homePlaced) panels[HOME_PANEL_ID] = { id: HOME_PANEL_ID, contentComponent: HOME_COMPONENT, title: HOME_TITLE }
  copy.panels = panels
  return copy
}
