import { useWorkspace } from '../workspace/workspaceContext'
import type { StudioDoc } from './types'

/** Document texte actif (celui de l'onglet Studio sélectionné), ou null. */
export function useActiveStudio(): { doc: StudioDoc | null; update: (change: (d: StudioDoc) => StudioDoc) => void } {
  const ws = useWorkspace()
  const id = ws.activeKind === 'studio' ? ws.activeStudioId : null
  const doc = id ? (ws.studios[id] ?? null) : null
  return { doc, update: (change) => id && ws.updateStudio(id, change) }
}
