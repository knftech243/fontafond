# Fontafond : spécification V1 et plan de mise en œuvre

> Document de référence du projet. Toute modification de périmètre, de règle, d'architecture ou de design y est **d'abord** reportée, avec une ligne dans le « Journal des modifications ».
> Maquette interactive : https://claude.ai/artifact/RPNcqVZZMuZxyPQ4mGqDSV (copie des sources dans [docs/maquette/](maquette/README.md)).

## Contexte
Fontafond est une plateforme web gratuite pour **dessiner ses propres polices**, **modifier des polices existantes** et **les utiliser avec un studio texte façon Photoshop**, jusqu'à la conversion du texte en vecteur. Public visé : créateurs de contenu, designers et entrepreneurs francophones (logos, visuels TikTok/Instagram, produits digitaux).

Décisions :
- Outil **100 % navigateur**, sans compte ni serveur : les projets restent sur l'appareil (IndexedDB) et s'exportent en `.json`.
- Hébergement gratuit sur Vercel.
- Thème **sombre teinté sarcelle** avec la palette de la charte (ci-dessous). Disposition des logiciels de création, sans reprendre la marque, le logo ni les icônes d'Adobe.

## 1. Périmètre V1

Inclus :
- **Éditeur de police** : grille des caractères (A–Z, a–z, 0–9, ponctuation, accents français), outils Plume (Bézier), Pinceau (main levée), Sélection, guides (ascendante, capitales, hauteur x, ligne de base, descendante), chasse, annuler/rétablir.
- **Export** `.otf` ; accents composés automatiquement (é = e + ´).
- **Modifier une police existante** : import `.ttf/.otf/.woff`, chaque lettre, chasse et paire de crénage modifiable ; réglages globaux inclinaison et approche ; nom de la version ; avertissement de licence (OFL autorise la modification, renommer si la licence l'exige).
- **Studio texte** :
  - 3 modes : texte de point, **texte de paragraphe** (cadre, retour à la ligne automatique), **texte sur tracé** (cercle, arc, courbe à la plume ; départ, côté, sens).
  - **Panneau Caractère** : police, taille, interlignage, crénage (métrique / 0 / manuel), approche, échelles verticale et horizontale, décalage de ligne de base, couleur, faux gras, faux italique, majuscules, petites capitales, souligné, barré.
  - **Panneau Paragraphe** : gauche, centré, droite, 4 justifications (dernière ligne gauche/centrée/droite, tout justifié), retraits gauche/droit/première ligne, espace avant/après. Pas de césure.
  - **Panneau Style** : contour (épaisseur, position extérieur/centre/intérieur, couleur, opacité) ; incrustation de couleur, de dégradé (linéaire/radial, angle, éditeur d'arrêts) et de motif (image importée).
  - **Convertir en contours** : le texte devient des formes vectorielles modifiables point par point.
  - Exports **SVG vectoriel** (chemins, sans police requise) et **PNG transparent** (1×, 2×, 4×).
- **Sélecteur de couleur standard** : carré saturation/luminosité, teinte, opacité, champs HEX/RVB/TSV, premier plan / arrière-plan (X : inverser, D : noir et blanc), pipette, nuancier (palette de la charte + couleurs enregistrées + 10 récentes).
- **Interface fixe, sans défilement de page** : l'application occupe tout l'écran comme un logiciel ; pas de barre de navigation à pastilles. Seul l'intérieur d'un panneau trop rempli défile.
- **Espace de travail modulable** (comme Photoshop) :
  - barre de menus **Fichier**, **Affichage**, **Fenêtre**, **Aide** ;
  - **fenêtres de document** en onglets (plusieurs polices ouvertes), détachables en fenêtre flottante, redimensionnables, avec zoom (Ctrl + molette, −/+, Ajuster, 25 % à 800 %) et déplacement (outil Main, barre d'espace) ;
  - **panneaux** (Glyphes, Glyphe sélectionné, Métriques, puis ceux du Studio) redimensionnables, **repliables**, **flottants**, fermables et réouvrables par le menu Fenêtre ; on peut aussi les glisser par leur onglet vers un autre emplacement ;
  - **espaces de travail** : « Essentiel », « Dessin », espaces enregistrés par l'utilisateur, « Réinitialiser » ; la disposition est mémorisée sur l'appareil ;
  - **apparence** : thème Sombre, Sombre profond ou Clair (palette de la charte), taille du texte de l'interface (petite, moyenne, grande), fond du plan de travail (sombre, gris, clair).
- Palette de commandes (Ctrl+K). Sur téléphone : interface fixe, document plein écran, panneaux regroupés en bas.

Exclu de la V1 : texte déformé (arc, vague…), calques multiples, ombre portée, lueur, graisse globale d'une police importée, export `.ttf`/`.woff2`, PDF vectoriel, césure.

## 2. Thème

| Rôle | Couleur | Usage |
|---|---|---|
| Fond | `#0b1a1b` (plan de travail `#081415`) | Derrière tout |
| Barres | `#102526` | Menus, outils, état |
| Panneaux | `#132c2d` ; survol `#1b3a3b` ; bordures `#24494a` | |
| **Sarcelle** | `#205A5C` | Onglet actif, élément sélectionné, boutons secondaires |
| **Bleu** | `#007FFF` ; `#0068D6` pour les boutons à texte blanc | Bouton principal, outil actif, points sélectionnés, focus |
| **Jaune** | `#F7D618`, texte foncé dessus | Glyphe en cours, avertissements, poignée de chasse |
| **Rouge** | `#CE1021`, texte blanc dessus | Logo « Aa », suppression, erreurs, guide des capitales |
| Texte | `#e8f1f1` ; secondaire `#9fb8b8` | Contraste ≥ 4,5:1 sur les panneaux |

Variables CSS : `src/theme/tokens.css`. Police d'interface : Inter ; titres : Space Grotesk.

## 3. Architecture

| Élément | Choix |
|---|---|
| Base | Vite + React + TypeScript (strict) |
| Police | opentype.js (lecture et écriture) |
| Main levée | perfect-freehand |
| Couleurs | react-colorful + champs maison |
| Sauvegarde | IndexedDB via idb-keyval ; export/import `.json` |
| Tests | Vitest (+ fake-indexeddb) ; Playwright pour les parcours |
| Lint | oxlint |
| Fenêtres | dockview-react 8.8.3 (MIT) : panneaux, onglets, groupes flottants, disposition en JSON |

Modèle (`src/model/types.ts`) : un `FontProject` contient les métriques (1000 unités/em, ascendante 800, descendante −200, capitales 700, hauteur x 500), des `Glyph` (caractère, unicode, nom, chasse, contours) et des paires de crénage. Coordonnées en unités de police, y vers le haut. Un contour est une suite de points « on » (sur la courbe) et « off » (poignées : 1 = quadratique, 2 = cubique).

Navigation : plus d'adresses par page. Tout se passe dans l'espace de travail (`src/workspace/`) : l'onglet « Accueil » liste les polices, chaque police ouverte est un onglet de document. La disposition (onglets, panneaux, fenêtres flottantes) est sauvegardée dans le `localStorage` du navigateur, les apparences aussi ; les polices restent dans IndexedDB.

```
src/
  model/   types.ts, defaultCharset.ts, project.ts, storage.ts
  font/    path.ts (contours → SVG) ; à venir : toOpentype.ts, fromOpentype.ts, composites.ts, globalAdjust.ts
  editor/  GlyphGrid.tsx, GlyphView.tsx ; à venir : outils pen/brush/select
  text/    à venir : layout.ts, onPath.ts, effects.ts, outline.ts, panneaux
  workspace/ Workspace.tsx (dockview), WorkspaceContext.tsx, layouts.ts, panels.tsx, DocumentPanel.tsx
  ui/      AppShell.tsx, MenuBar.tsx, Dialog.tsx, Icon.tsx ; à venir : ColorPicker/, GradientEditor, NumberField, CommandPalette
  pages/   Projects.tsx (contenu de l'onglet Accueil) ; à venir : Studio
  theme/   tokens.css (+ thèmes), app.css, dockview.css, appearance.ts
```

## 4. Étapes

| # | Contenu | Test | État |
|---|---|---|---|
| 0 | Maquette : palette, sélecteur de couleur, panneaux, texte sur tracé, conversion | Validation visuelle | Fait |
| 1 | Squelette, thème, modèle, stockage, « Mes polices », grille des glyphes, métriques | Un projet survit au rechargement | Fait |
| 1 bis | Espace de travail modulable : interface fixe, menus, onglets de documents, panneaux repliables et flottants, espaces de travail, apparence, zoom et déplacement | Aucun défilement de page ; disposition conservée au rechargement | Fait |
| 2 | Éditeur : Plume, Pinceau, Sélection, chasse à la souris, annuler/rétablir | Dessiner un « A » et un « a » | À faire |
| 3 | Export `.otf`, import et modification d'une police existante, accents composés, réglages globaux | Relire le `.otf` exporté ; l'installer | À faire |
| 4 | Studio 1 : moteur de mise en page, Caractère, Paragraphe, sélecteur de couleur | Vitest : approche, crénage, justification, retraits | À faire |
| 5 | Studio 2 : texte sur tracé, effets, conversion en contours, exports SVG/PNG | Le SVG ne contient que des `<path>` | À faire |
| 6 | Crénage par paires, déploiement Vercel, README final | Lien public testé sur téléphone | À faire |

À chaque étape : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, commit clair, push.

## 5. Points d'attention
- Écriture du crénage dans le `.otf` par opentype.js : à vérifier (étape 6). À défaut, il reste appliqué dans le Studio et les exports.
- Contour « intérieur » : par masquage (clipPath) ; pas de fusion des formes à la conversion en V1.
- Pipette : API EyeDropper absente de Firefox/Safari, repli sur le prélèvement dans l'aperçu.
- Texte sur tracé et justification ne se combinent pas en V1.
- Espace « Texte » : ajouté avec le Studio (étape 4), car ses panneaux n'existent pas encore.
- Fenêtres flottantes désactivées sur petit écran (moins de 860 px de large).
- Le stockage du navigateur peut être vidé (navigation privée, nettoyage) : inviter à exporter le `.json`.

## Journal des modifications
- **2026-11-06** : création du plan. Périmètre V1, thème sombre sarcelle sur la palette de la charte (aucun violet), sélecteur de couleur standard, studio texte (Caractère, Paragraphe, texte sur tracé, contour, dégradé/incrustation, conversion en contours), modification de polices existantes. Nom du projet : Fontafond (dépôt `knftech243/fontafond`).
- **2026-11-06** : étape 1 livrée (squelette Vite + React + TS, thème, modèle de données, stockage IndexedDB, écran « Mes polices », éditeur avec grille des glyphes, chasse et métriques modifiables).
- **2026-11-06** : demande de Franck : fenêtres modifiables comme dans Photoshop (redimensionner, replier, flottantes, espaces de travail), fenêtre de document et apparence personnalisables, interface fixe sans barre de navigation ni défilement de page. Ajout de l'étape 1 bis et de dockview.
