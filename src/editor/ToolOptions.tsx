import { isPenTool, type Tool, type ToolOptions as Options } from '../workspace/workspaceContext'

interface Props {
  tool: Tool
  options: Options
  onChange: (patch: Partial<Options>) => void
  hasSelection: boolean
  onDeleteSelection: () => void
}

const HINTS: Record<Tool, string> = {
  pen: 'Clic : point d’angle · clic-glisser : courbe · clic sur le point jaune ou Entrée : fermer · Retour arrière : annuler le dernier point.',
  curvature: 'Cliquez pour poser des points : la courbe passe par eux · double-clic sur un point : angle ou lisse · point jaune ou Entrée : fermer.',
  addPoint: 'Cliquez sur un contour pour y ajouter un point, sans changer la forme.',
  deletePoint: 'Cliquez sur un point pour le supprimer avec ses poignées.',
  convert: 'Clic sur un point lisse : angle · clic-glisser sur un angle : courbe · glisser une poignée : la déplacer seule.',
  brush: 'Dessinez à main levée : chaque trait devient une forme pleine.',
  select: 'Clic : point · Maj : ajouter · dans une forme : tout le contour · cadre : plusieurs points · flèches : déplacer · Alt : poignée libre.',
  hand: 'Glissez pour déplacer la vue. Molette : défiler ; Ctrl + molette : zoomer ; barre d’espace : Main temporaire.',
  zoom: 'Cliquez pour agrandir, Alt + clic pour réduire. Ctrl + 0 : ajuster à la fenêtre.',
}

/** Barre d'options : réglages de l'outil actif, comme dans les logiciels de création. */
export function ToolOptions({ tool, options, onChange, hasSelection, onDeleteSelection }: Props) {
  const check = (key: 'snap' | 'showHandles' | 'template' | 'pressure', label: string) => (
    <label className="fd-opt">
      <input type="checkbox" checked={options[key]} onChange={(e) => onChange({ [key]: e.target.checked })} />
      {label}
    </label>
  )
  return (
    <>
      {(isPenTool(tool) || tool === 'select') && (
        <>
          {check('snap', 'Aimanter à la grille')}
          {check('showHandles', 'Afficher les poignées')}
        </>
      )}
      {tool === 'brush' && (
        <>
          <label className="fd-opt">
            Épaisseur
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={options.brushSize}
              onChange={(e) => onChange({ brushSize: Number(e.target.value) })}
            />
            <span className="fd-opt-value">{options.brushSize}</span>
          </label>
          <label className="fd-opt">
            Lissage
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(options.smoothing * 100)}
              onChange={(e) => onChange({ smoothing: Number(e.target.value) / 100 })}
            />
            <span className="fd-opt-value">{Math.round(options.smoothing * 100)} %</span>
          </label>
          {check('pressure', 'Pression du stylet')}
        </>
      )}
      {(isPenTool(tool) || tool === 'brush' || tool === 'select') && check('template', 'Lettre modèle')}
      {tool === 'select' && (
        <button type="button" className="fd-btn fd-btn-sm" disabled={!hasSelection} onClick={onDeleteSelection}>
          Supprimer la sélection
        </button>
      )}
      <span className="fd-sep" aria-hidden="true" />
      <span className="fd-muted fd-options-hint">{HINTS[tool]}</span>
    </>
  )
}
