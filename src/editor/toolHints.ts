import type { Tool } from '../workspace/workspaceContext'

/** Consignes de chaque outil, affichées dans la barre d'options. */
export const TOOL_HINTS: Record<Tool, string> = {
  pen: 'Clic : point d’angle · clic-glisser : courbe · clic sur le point jaune ou Entrée : fermer · Retour arrière : annuler le dernier point.',
  curvature: 'Cliquez pour poser des points : la courbe passe par eux · double-clic sur un point : angle ou lisse · point jaune ou Entrée : fermer.',
  addPoint: 'Cliquez sur un contour pour y ajouter un point, sans changer la forme.',
  deletePoint: 'Cliquez sur un point pour le supprimer avec ses poignées.',
  convert: 'Clic sur un point lisse : angle · clic-glisser sur un angle : courbe · glisser une poignée : la déplacer seule.',
  brush: 'Dessinez à main levée : chaque trait devient une forme pleine.',
  select: 'Clic : point · Maj : ajouter · dans une forme : tout le contour · cadre : plusieurs points · flèches : déplacer · Alt : poignée libre.',
  text: 'Dans un document texte : clic = texte de point · clic-glisser = cadre de paragraphe · tapez dans la zone « Texte ». Sélection (V) : déplacer le bloc.',
  hand: 'Glissez pour déplacer la vue. Molette : défiler ; Ctrl + molette : zoomer ; barre d’espace : Main temporaire.',
  zoom: 'Cliquez pour agrandir, Alt + clic pour réduire. Ctrl + 0 : ajuster à la fenêtre.',
}
