# Fontafond

Créez et modifiez vos polices dans le navigateur, puis utilisez-les avec un studio texte façon Photoshop. Gratuit, sans compte : vos projets restent sur votre appareil.

> Projet en cours de construction : voir [docs/PLAN.md](docs/PLAN.md) pour le périmètre et l'avancement des étapes.

## Ce qui fonctionne déjà (étapes 1 à 3)
- **Exporter la police en .otf** (installable sur PC et téléphone) : glyphes dessinés et accents automatiques.
- **Accents automatiques** : é = e + ´ dès que la lettre et le signe sont dessinés (groupe « Signes »).
- **Modifier une police existante** : ouvrir un .ttf, .otf ou .woff (licence affichée, nom de votre version, crénage conservé).
- **Ajuster toute la police** : inclinaison et approche globale, annulables d'un coup.
- **Famille d'outils Plume** (clic long ou clic droit sur la Plume) : Plume, Plume de courbure, Ajout de point (+), Suppression de point (−), Conversion de point (angle ↔ courbe) ; Maj+P pour passer de l'un à l'autre.
- **Dessin des lettres** : Plume (P, angles et courbes), Pinceau (B, main levée, souris, doigt ou stylet), Sélection (V, points, poignées, cadre, flèches, Suppr), chasse à la souris, approches gauche et droite, lettre modèle à décalquer, aimantation à la grille.
- **Annuler / Rétablir** (Ctrl+Z, Ctrl+Maj+Z) et menu **Édition**.
- Panneau **Aperçu** : un mot test écrit avec vos lettres, en direct.
- Interface fixe, plein écran, comme un logiciel : la page ne défile jamais.
- Menus **Fichier**, **Affichage**, **Fenêtre**, **Aide**.
- Plusieurs polices ouvertes en **onglets** ; chaque fenêtre ou panneau se **redimensionne**, se **replie**, se **détache en fenêtre flottante**, se déplace en glissant son onglet.
- **Espaces de travail** « Essentiel » et « Dessin », enregistrement de vos propres espaces, « Réinitialiser » ; la disposition est mémorisée.
- **Apparence** : thème Sombre, Sombre profond ou Clair, taille du texte, fond du plan de travail.
- Document : zoom (Ctrl + molette, −/+, Ajuster) et outil Main (ou barre d'espace).
- « Mes polices » (onglet Accueil) : créer, renommer, supprimer, exporter et importer un projet (`.json`).
- Grille des caractères (majuscules, minuscules, chiffres, ponctuation, accents français), chasse et métriques modifiables, sauvegarde automatique sur l'appareil.

## Lancer le projet

Il faut Node.js 20 ou plus récent.

```bash
npm install
```

```bash
npm run dev
```

Puis ouvrez l'adresse affichée (en général http://localhost:5173).

## Vérifier avant chaque commit

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

## Structure

```
src/
  model/   données : types, jeu de caractères, projet, stockage IndexedDB
  font/    contours, export .otf, import de polices, accents automatiques, réglages globaux
  editor/  grille, affichage et outils de dessin (géométrie, historique)
  workspace/ espace de travail : fenêtres (dockview), panneaux, document, dispositions
  ui/      coque fixe, menus, boîtes de dialogue, icônes
  pages/   contenu de l'onglet Accueil (Mes polices)
  theme/   couleurs et thèmes (tokens.css), styles, apparence
docs/
  PLAN.md      document de référence
  maquette/    sources de la maquette validée
```
