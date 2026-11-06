## Règles du projet Fontafond

- `docs/PLAN.md` est le document de référence. Pour toute modification (périmètre, règle, architecture, design), mettre à jour `docs/PLAN.md` **en premier**, y compris son « Journal des modifications », avant de toucher au code.
- Échanges, documents, textes de l'interface et messages de commit en français.
- Palette : uniquement les couleurs de `src/theme/tokens.css` (sarcelle, bleu, jaune, rouge et leurs fonds). Pas de violet.
- Ne pas reprendre la marque, le logo ni les icônes d'Adobe : seulement la logique d'organisation des logiciels de création.
- Ajouter une dépendance avec `npm install` ; vérifier sa dernière version avec `npm view <paquet> version`.
- Avant de déclarer une tâche terminée : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
