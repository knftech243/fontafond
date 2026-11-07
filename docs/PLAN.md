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
  editor/  GlyphGrid.tsx, GlyphView.tsx, EditorOverlay.tsx (outils), geometry.ts, history.ts, ToolOptions.tsx
  text/    à venir : layout.ts, onPath.ts, effects.ts, outline.ts, panneaux
  workspace/ Workspace.tsx (dockview), WorkspaceContext.tsx, layouts.ts, panels.tsx, DocumentPanel.tsx
  ui/      AppShell.tsx, MenuBar.tsx, Dialog.tsx, Icon.tsx ; à venir : ColorPicker/, GradientEditor, NumberField, CommandPalette
  pages/   Projects.tsx (contenu de l'onglet Accueil) ; à venir : Studio
  theme/   tokens.css (+ thèmes), app.css, dockview.css, appearance.ts
```

## 3 bis. Éditeur de glyphe (étape 2)

| Outil / fonction | Comportement |
|---|---|
| **Plume (P)** | Clic = point d'angle ; clic-glisser = point courbe avec poignées symétriques ; clic sur le premier point = ferme le contour ; Échap ou Entrée = ferme le contour s'il a au moins 3 points, sinon l'abandonne. |
| **Plume de courbure** | Chaque clic pose un point ; la courbe passe automatiquement par les points ; aperçu du segment suivant sous la souris ; double-clic sur un point du tracé = angle ou lisse. |
| **Ajout de point d'ancrage (+)** | Clic sur un contour : un point est inséré sans déformer la courbe. |
| **Suppression de point d'ancrage (−)** | Clic sur un point : il disparaît avec ses poignées. |
| **Conversion de point** | Clic sur un point lisse = angle ; clic-glisser sur un angle = point lisse ; glisser une poignée = la déplace seule. |
| **Famille Plume** | Un seul bouton regroupe Plume, Plume de courbure, Ajout, Suppression et Conversion : clic long ou clic droit pour choisir, Maj+P pour passer de l'un à l'autre. |
| **Pinceau (B)** | Trait à main levée (souris, doigt, stylet) transformé en forme pleine (perfect-freehand), simplifié, puis ajouté comme contour. Options : épaisseur (10 à 200 unités), lissage, pression du stylet. |
| **Sélection (V)** | Clic sur un point (Maj = ajouter), cadre de sélection, clic dans une forme = tout le contour ; glisser pour déplacer (les poignées suivent leur point ; sur un point courbe, la poignée opposée reste alignée, Alt pour les séparer) ; flèches = 1 unité (Maj = 10) ; Suppr = supprimer (un contour de moins de 3 points disparaît). |
| **Chasse et approches** | Poignée jaune de chasse à tirer avec la Sélection ; panneau Glyphe : chasse, approche gauche et droite (calculées depuis la boîte englobante), modifiables. |
| **Annuler / Rétablir** | Ctrl+Z, Ctrl+Maj+Z, Ctrl+Y ; historique par police, 100 pas, une étape par geste terminé. Menu **Édition** : Annuler, Rétablir, Tout sélectionner, Supprimer la sélection, Effacer le glyphe. |
| **Options** | Aimanter à la grille (10 unités), afficher les poignées, lettre modèle grise (pour décalquer), réglages du pinceau. |
| **Panneau Aperçu** | Mot test modifiable dessiné avec les glyphes de la police, en direct. |

## 3 ter. Polices (étape 3)

| Fonction | Comportement |
|---|---|
| **Exporter la police (.otf)** | Fichier › Exporter la police (.otf) ou bouton « Exporter .otf ». Fichier OpenType (contours CFF) avec `.notdef`, espace, glyphes dessinés et accents composés ; glyphes non dessinés exclus. |
| **Accents automatiques** | Groupe « Signes » (´ ` ˆ ¨ ¸ ˜ ı). « é » non dessiné = « e » + « ´ » ; signe remonté pour les majuscules, cédille en bas, î/ï sur « ı ». Vignette « auto » ; « Décomposer pour modifier » copie les contours. |
| **Modifier une police existante** | Ouvrir un `.ttf`, `.otf` ou `.woff` : contours, chasses, métriques et paires de crénage repris ; licence du fichier affichée ; nom de la nouvelle version. WOFF2 non pris en charge. |
| **Réglages globaux** | Édition › Ajuster toute la police : inclinaison et approche globale, aperçu en direct, une seule annulation. |

Limite : opentype.js 2.0 n'écrit pas les tables de crénage ; les paires restent dans le projet et seront écrites à l'étape 6.

## 3 quater. Studio texte (étape 4)

| Fonction | Comportement |
|---|---|
| **Document texte** | Fichier › Nouveau document texte, ou « Nouveau texte » sur l'Accueil. Onglet de document (flottant, redimensionnable), plan de travail 1 200 × 800 px, zoom et déplacement, sauvegarde automatique. |
| **Outil Texte (T)** | Clic = texte de point ; clic-glisser = cadre de texte de paragraphe ; saisie dans la zone « Texte » du document. Sélection (V) : déplacer le bloc ; poignée du cadre : largeur. |
| **Panneau Caractère** | Police (Mes polices), taille, interlignage (auto = 120 %), crénage (métrique / 0), approche, échelles verticale et horizontale, décalage de ligne de base, faux gras, faux italique, majuscules, petites capitales, souligné, barré. Glisser sur l'étiquette pour changer une valeur, double-clic pour la remettre par défaut. |
| **Panneau Paragraphe** | Gauche, centré, droite, 3 justifications (dernière ligne gauche/centrée/droite), tout justifié ; retraits gauche, droit, première ligne ; espace avant/après. |
| **Panneau Couleur** | Carré saturation/luminosité, teinte, opacité ; HEX, R V B, T S L (teinte, saturation, luminosité) ; premier plan / arrière-plan (X : inverser, D : noir et blanc) ; pipette ; nuancier (charte, enregistrées, récentes). |
| **Espace « Texte »** | Studio au centre, Caractère et Paragraphe à droite, Couleur en dessous. |
| **Annuler / Rétablir** | Aussi dans le Studio ; changements rapprochés (moins de 600 ms) **d'un même réglage** regroupés : un glisser de curseur = une étape, mais deux réglages différents = deux étapes. |
| **Caractères absents** | Cadre en pointillés à la place de la lettre et message « N caractères absents de la police ». |

## 4. Étapes

| # | Contenu | Test | État |
|---|---|---|---|
| 0 | Maquette : palette, sélecteur de couleur, panneaux, texte sur tracé, conversion | Validation visuelle | Fait |
| 1 | Squelette, thème, modèle, stockage, « Mes polices », grille des glyphes, métriques | Un projet survit au rechargement | Fait |
| 1 bis | Espace de travail modulable : interface fixe, menus, onglets de documents, panneaux repliables et flottants, espaces de travail, apparence, zoom et déplacement | Aucun défilement de page ; disposition conservée au rechargement | Fait (fusionné dans `main`) |
| 2 | Éditeur : Plume, Pinceau, Sélection, chasse à la souris, approches, annuler/rétablir, menu Édition, panneau Aperçu | Dessiner un « A » et un « a » | Fait (fusionné dans `main`) |
| 2 bis | Famille d'outils Plume (Plume de courbure, Ajout, Suppression, Conversion de point) | Tracer un « O » en 4 clics, convertir un angle en courbe | Fait (fusionné dans `main`) |
| 3 | Export `.otf`, import et modification d'une police existante, accents composés, réglages globaux | Relire le `.otf` exporté ; l'installer | Fait (fusionné dans `main`) |
| 4 | Studio 1 : moteur de mise en page, Caractère, Paragraphe, sélecteur de couleur | Vitest : approche, crénage, justification, retraits | Fait (en attente de validation) |
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
- **2026-11-07** : étape 1 bis validée par Franck et fusionnée dans `main`. Début de l'étape 2 (éditeur de glyphe), détail en section 3 bis.
- **2026-11-07** : étape 2 livrée sur la branche `etape-2-editeur` : Plume (angles et courbes, sens des contreformes automatique), Pinceau (perfect-freehand), Sélection (points, poignées alignées, cadre, flèches, suppression), chasse à la souris, approches, annuler/rétablir, menu Édition (dont « Inverser le sens du contour »), panneau Aperçu. Correctif : la police active est retrouvée au rechargement même si un panneau avait le focus.
- **2026-11-07** : étape 2 validée par Franck (démo en ligne) et fusionnée dans `main`, pour que GitHub et le PC de Franck aient la même version que la démo.
- **2026-11-07** : retour de Franck : la Plume manquait de ses propriétés et de la conversion de point. Ajout de l'étape 2 bis (famille d'outils Plume comme dans Photoshop + Conversion de point).
- **2026-11-07** : étape 2 bis livrée sur la branche `etape-2bis-plume` : bouton Plume groupé (clic long ou clic droit), Plume de courbure, Ajout et Suppression de point d'ancrage (+ et −), Conversion de point, Maj+P pour passer d'un outil à l'autre.
- **2026-11-07** : étape 2 bis validée et fusionnée dans `main`. Début de l'étape 3 (polices), détail en section 3 ter.
- **2026-11-07** : étape 3 livrée sur la branche `etape-3-polices` : export `.otf` validé avec fontTools, accents automatiques (groupe « Signes »), import TTF/OTF/WOFF avec licence et crénage conservé, réglages globaux (inclinaison, approche) annulables d'un coup. Les guides de l'éditeur s'adaptent aux polices en 2048 unités/em.
- **2026-11-07** : étape 3 validée et fusionnée dans `main`. Début de l'étape 4 (Studio texte, partie 1), détail en section 3 quater.
- **2026-11-07** : étape 4 livrée sur la branche `etape-4-studio` : documents texte (Accueil, Fichier › Nouveau document texte), outil Texte (point et paragraphe), panneaux Caractère, Paragraphe et Couleur (sélecteur standard, X / D, pipette, nuancier), espace de travail « Texte », annulation regroupée par réglage, sauvegarde sur l'appareil. Testé avec DejaVu Sans et DejaVu Serif importées.
