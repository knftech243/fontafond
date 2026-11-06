# Fontafond

Créez et modifiez vos polices dans le navigateur, puis utilisez-les avec un studio texte façon Photoshop. Gratuit, sans compte : vos projets restent sur votre appareil.

> Projet en cours de construction : voir [docs/PLAN.md](docs/PLAN.md) pour le périmètre et l'avancement des étapes.

## Ce qui fonctionne déjà (étape 1)
- « Mes polices » : créer, renommer, supprimer, exporter et importer un projet (`.json`).
- Éditeur : grille des caractères (majuscules, minuscules, chiffres, ponctuation, accents français), recherche, lignes guides, chasse et métriques modifiables.
- Sauvegarde automatique sur l'appareil.

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
  font/    conversions de contours (et bientôt export .otf)
  editor/  grille et affichage des glyphes
  ui/      coque de l'application, icônes
  pages/   Mes polices, Éditeur
  theme/   couleurs (tokens.css) et styles
docs/
  PLAN.md      document de référence
  maquette/    sources de la maquette validée
```
