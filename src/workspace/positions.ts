import type { DockviewApi } from 'dockview-react'
import { HOME_PANEL_ID, TOOL_PANELS } from './layouts'

const isToolPanel = (id: string) => TOOL_PANELS.some((t) => t.id === id)
const isDocumentPanel = (id: string) => id === HOME_PANEL_ID || id.startsWith('doc:')

/** Où ajouter un nouveau document : avec les autres documents, sinon à gauche des panneaux. */
export function documentPosition(api: DockviewApi) {
  const anchor = api.panels.find((p) => isDocumentPanel(p.id))
  if (anchor) return { referencePanel: anchor.id, direction: 'within' as const }
  const tool = api.panels.find((p) => isToolPanel(p.id))
  if (tool) return { referencePanel: tool.id, direction: 'left' as const }
  return undefined
}

/** Où rouvrir un panneau : avec les autres panneaux, sinon à droite des documents. */
export function toolPosition(api: DockviewApi) {
  const tool = api.panels.find((p) => isToolPanel(p.id))
  if (tool) return { referencePanel: tool.id, direction: 'within' as const }
  const doc = api.panels.find((p) => isDocumentPanel(p.id))
  if (doc) return { referencePanel: doc.id, direction: 'right' as const }
  return undefined
}

export { isDocumentPanel, isToolPanel }

/** Événement envoyé par le filigrane « Réinitialiser l'espace de travail ». */
export const RESET_EVENT = 'fontafond:reset-workspace'

/** Événement envoyé par l'Accueil pour ouvrir une police existante (.ttf, .otf, .woff). */
export const IMPORT_FONT_EVENT = 'fontafond:import-font'
