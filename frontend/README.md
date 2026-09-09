# BookList Pro Frontend

Application Expo React Native en TypeScript strict pour BookList Pro.

## Demarrage

```bash
npm install
npm run web
```

La commande `npm run web` lance `npx expo start --web` via le script Expo.

## Scripts

| Commande | Role |
| --- | --- |
| `npm start` | Lance Expo |
| `npm run web` | Lance Expo pour navigateur |
| `npm run typecheck` | Verifie TypeScript en mode strict |
| `npm test` | Execute les tests Vitest |
| `npm run lint:architecture` | Controle les regles d'architecture locales |
| `npm run validate` | Execute toutes les validations |

## Architecture

```text
app/          Routes Expo Router et composition globale
components/   Composants reutilisables sans acces API direct
features/     Ecrans et logique de fonctionnalite
hooks/        Hooks React partages
services/     Integrations externes, dont services/api
domain/       Types et regles metier pures
theme/        Couleurs, espacements, typographie
docs/ADR/     Decisions d'architecture
__tests__/    Tests automatises
```

Regles locales :

- aucun `any` dans le code applicatif ;
- aucun `fetch` hors `services/api/` ;
- aucune URL API dans `app/` ou `components/` ;
- aucun fichier applicatif ne doit depasser 250 lignes ;
- pas de Docker pour le frontend.

## Configuration API

Le client API lit `EXPO_PUBLIC_API_URL`.

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 npm run web
```

Si la variable est absente, le socle utilise `http://localhost:3000`.
