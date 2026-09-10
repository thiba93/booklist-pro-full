# BookList Pro Frontend

Application Expo React Native en TypeScript strict pour BookList Pro.

## Lot 1

Le frontend consomme l'API BookList Pro pour les premiers parcours metier :

- liste paginee des ouvrages depuis `GET /books` avec `limit=20` par defaut ;
- recherche par titre ou auteur, filtre lu/non lu et tri A-Z/Z-A ;
- fiche detail depuis `GET /books/:id` ;
- creation, edition complete avec `If-Match`, suppression et bascule lu/non lu ;
- navigation locale entre liste, detail, ajout et edition ;
- suppression confirmee puis annulable pendant 5 secondes avant appel API.

L'etat serveur est gere par TanStack Query. Les cles de cache sont structurees
dans `features/books/bookQueryKeys.ts`, et les mutations invalident les listes
apres creation, modification, suppression ou changement de statut.

Les formulaires utilisent `react-hook-form`, `@hookform/resolvers` et `zod`.
Les erreurs API `422` sont mappees vers les champs concernes lorsque l'API
renvoie `champs`.

## Lot 2

Le Lot 2 enrichit les parcours ouvrages :

- notes de lecture horodatees dans la fiche detail, avec ajout et suppression ;
- coup de coeur avec icone coeur dans la liste et la fiche ;
- recherche serveur par titre ou auteur avec debounce de 300 ms ;
- annulation des requetes precedentes via le `AbortSignal` TanStack Query ;
- filtres serveur lu/non lu et favori ;
- tri serveur par titre, auteur, annee ou note ;
- pagination serveur `limit=20` avec etat distinct pendant le chargement de page.

Les mutations de statut lu/non lu et favori sont optimistes. Le cache detail et
les pages de liste visibles sont mis a jour immediatement, puis restaures si le
serveur refuse la mutation.

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

## Tests

Les tests couvrent les regles pures et les comportements des Lots 1 et 2 :

- normalisation des cles de cache et pagination par defaut ;
- validation du formulaire ouvrage ;
- conversion formulaire vers payload API ;
- affichage des erreurs `422` sous les bons champs.
- rendu composant des actions accessibles lu/favori ;
- hooks TanStack Query avec API simulee, signal d'annulation et rollback
  optimiste.

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
Le timeout HTTP peut etre ajuste via `EXPO_PUBLIC_API_TIMEOUT_MS`.
