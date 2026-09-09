# ADR 0001 - Architecture frontend

## Statut

Acceptee.

## Contexte

BookList Pro consomme une API Express fournie separement. Le frontend doit
rester compatible Expo Web, conserver un typage strict et eviter que les routes
ou composants React connaissent les details reseau.

## Decision

Le frontend est isole dans `frontend/` et organise ainsi :

- `app/` contient les routes Expo Router et la composition globale.
- `components/` contient les composants reutilisables sans dependance API.
- `features/` contient les ecrans par fonctionnalite.
- `hooks/` contient les hooks partages.
- `services/api/` contient toute logique HTTP et la configuration API.
- `domain/` contient les types et regles metier pures.
- `theme/` centralise les tokens visuels.
- `docs/ADR/` documente les decisions.
- `__tests__/` regroupe les tests.

Un script `lint:architecture` verifie les contraintes locales : absence de
`any`, absence de `fetch` hors `services/api/`, absence d'URL API dans
`app/` et `components/`, et limite de 250 lignes par fichier applicatif.

## Consequences

Les prochains ecrans devront passer par des services types pour acceder au
backend. Cette separation rend les tests unitaires plus simples et reduit le
risque de couplage entre interface et API.
