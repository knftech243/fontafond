import { useWorkspace } from '../workspace/workspaceContext'

/** Ouvre le panneau Couleur (ou l'affiche s'il est déjà ouvert). */
export function useShowColorPanel() {
  const { api } = useWorkspace()
  return () => {
    if (!api) return
    const p = api.getPanel('color')
    if (p) p.api.setActive()
    else {
      const ref = api.getPanel('character') ?? api.getPanel('paragraph')
      api.addPanel({ id: 'color', component: 'color', title: 'Couleur', minimumHeight: 34, ...(ref ? { position: { referencePanel: ref.id, direction: 'below' as const } } : {}) })
    }
  }
}
