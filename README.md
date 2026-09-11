# BookList Pro

Application de gestion de bibliotheque personnelle (React Native / Expo)
adossee a une API Express fournie (`api-books-v2/`). Projet realise dans le
cadre de l'evaluation React Native niveau M2, en plusieurs lots successifs.

> La documentation exhaustive de l'API (routes, modele de donnees, codes
> d'erreur, mode chaos) vit dans [`api-books-v2/README.md`](api-books-v2/README.md).
> Ce fichier couvre la vue d'ensemble du projet : demarrage, comptes de
> demonstration, travail realise et retours d'experience.

## Structure du depot

```text
api-books-v2/   API Express fournie (livres, notes, auth, sync, stats) — reference a utiliser
frontend/       Application Expo (React Native + TypeScript strict)
src/            Duplicata de l'API a la racine (scaffolding initial) — ne pas utiliser, ecoute
                aussi sur le port 3000 par defaut : source de confusion si les deux tournent
```

---

## Demarrage

Deux serveurs a lancer, dans deux terminaux separes.

### 1. Backend (`api-books-v2/`)

```bash
cd api-books-v2
npm install
npm run seed          # genere 500 livres + les 2 comptes de demo
npm run auth           # AUTH_REQUIRED=true, port 3000 par defaut
```

Sous PowerShell, la syntaxe `VAR=valeur commande` ne fonctionne pas :

```powershell
cd api-books-v2
npm install
npm run seed
$env:AUTH_REQUIRED = "true"; npm start
```

Verification : <http://localhost:3000/health>

> **Port 3000 deja pris ?** Sur certains postes, Grafana (ou un autre outil
> deja installe) ecoute par defaut sur ce port et n'a rien a voir avec le
> projet. Solution la plus simple : demarrer l'API sur un autre port sans
> rien desinstaller :
>
> ```powershell
> $env:PORT = "3001"; $env:AUTH_REQUIRED = "true"; npm start
> ```
>
> Adapter alors `EXPO_PUBLIC_API_URL` cote frontend (voir plus bas).

### 2. Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run web
```

Cree un fichier `frontend/.env.local` (ignore par git) si l'API ne tourne
pas sur le port par defaut :

```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### Verifier que tout fonctionne

```bash
cd frontend
npm run validate   # typecheck + tests Vitest + regles d'architecture
```

---

## Variables d'environnement

### Backend (`api-books-v2/`)

| Variable            | Defaut        | Role                                                  |
| ------------------- | ------------- | ----------------------------------------------------- |
| `PORT`              | `3000`        | Port d'ecoute                                         |
| `AUTH_REQUIRED`     | `false`       | Active l'authentification et les roles                |
| `ACCESS_TOKEN_TTL`  | `120s`        | Duree de vie du jeton d'acces (volontairement courte) |
| `REFRESH_TOKEN_TTL` | `7d`          | Duree de vie du jeton de rafraichissement             |
| `CHAOS_LATENCE`     | `0`           | Latence artificielle en ms (mode degrade)             |
| `CHAOS_ECHEC`       | `0`           | Probabilite de reponse 503 (entre 0 et 1)             |
| `CHAOS_AUTH`        | `false`       | Applique aussi le chaos aux routes `/auth`            |
| `JWT_SECRET`        | valeur de dev | Secret de signature des jetons                        |

Detail complet : [`api-books-v2/README.md`](api-books-v2/README.md).

### Frontend (`frontend/`)

| Variable                     | Defaut                  | Role                                   |
| ---------------------------- | ----------------------- | -------------------------------------- |
| `EXPO_PUBLIC_API_URL`        | `http://localhost:3000` | URL de base de l'API consommee         |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `8000`                  | Delai avant abandon d'une requete HTTP |

---

## Comptes de demonstration

Crees par `npm run seed` cote backend :

| Email                 | Mot de passe | Role      | Droits             |
| --------------------- | ------------ | --------- | ------------------ |
| `editeur@booklist.fr` | `editeur123` | `editeur` | lecture + ecriture |
| `lecteur@booklist.fr` | `lecteur123` | `lecteur` | lecture seule      |

---

## Contributeurs

| Pseudo GitHub  | Nom             |
| -------------- | --------------- |
| `hovominhkhue` | Vo Minh Khue HO |
| `OvniDeJUL`    | Erdal KARAER    |
| `thiba93`      | Thibault SENE   |

---

## Travail realise après la présentation

### Lot 4 — Authentification, hors ligne, conflits

**Conflits**

- Gestion des 409, aussi bien pour le rejeu hors ligne (`POST /sync`) que
  pour une edition en ligne concurrente (`PUT /books/:id`).
- Fonction pure testee isolement pour decider du sort d'une mutation en
  conflit (derniere intention connue gagne, comparaison d'horodatage).
- Strategie documentee dans
  [`frontend/docs/ADR/003-resolution-conflits.md`](frontend/docs/ADR/003-resolution-conflits.md),
  alternatives ecartees comprises.
- Panneau de resolution manuelle (garder la version serveur / reappliquer
  sa modification) quand la resolution automatique ne peut pas trancher
  seule.

### Lot 5 — non traité

Laisse de cote faute de temps.

---

## Choses apprises pendant ce cours

- **React Query a son propre detecteur reseau**, independant de celui
  qu'on ecrit soi-meme : `networkMode: "always"` est necessaire sur les
  mutations des qu'on gere sa propre logique hors ligne, sinon React Query
  met lui-meme en pause l'execution avant meme d'atteindre notre code — un
  vrai bug rencontre et corrige durant ce lot.
- **Un mutex applicatif tient en quelques lignes** : la file de mutations
  hors ligne, sa persistance, et le rejeu par lot ne demandent pas de
  librairie tierce — un module singleton avec pub/sub (`ecouterFileMutations`)
  suffit a piloter un indicateur d'etat reactif depuis plusieurs composants.
- **L'idempotence cote serveur a ses limites cote client.** Rejouer une
  mutation deja traitee avec le meme identifiant renvoie le resultat
  memorise (utile contre les doublons), mais rebaser une mutation en
  conflit sur une nouvelle version DOIT changer d'identifiant, sinon le
  serveur renvoie l'ancien resultat au lieu de reevaluer — bug reel
  rencontre, diagnostique en confrontant les tests (qui mockaient la
  reponse et masquaient le probleme) a de vraies requetes contre l'API.
- **Resolution de conflits : pas de solution universelle.** Choisir entre
  "le serveur gagne", "le client gagne" et "dernier ecrit gagne" est un
  compromis produit, pas une question technique — documenter le choix (et
  les alternatives ecartees) dans une ADR est plus utile qu'un commentaire
  de code.
- **Nouveaux hooks ecrits pendant ce lot** : `useNetworkStatus` (etat
  reseau reactif), `useMutationQueueStatus` / `useConflictedMutations`
  (projection reactive d'un module singleton vers des composants React),
  `useSyncReplay` (declenche le rejeu au retour du reseau et a la
  connexion), et le decoupage de `useBooksQueries` en variantes
  online/offline sans dupliquer la logique d'invalidation du cache.
- **La limite de lignes par fichier (regle d'architecture du projet) pousse
  a extraire tot** : composants de champs de formulaire, panneaux de
  resolution de conflit et hooks de requete ont ete separes en fichiers
  degages plutot que d'accumuler dans un seul, ce qui a naturellement
  clarifie les responsabilites.

---

## Choses apprises après la présentation

### Mon apprentissage (thiba93)

- J'ai consolidé ma compréhension du cycle CRUD en React (`Create`, `Read`, `Update`, `Delete`) et de la façon dont les données circulent entre l'interface, la logique métier et l'API.
- J'ai appris à structurer proprement les appels API via une couche de services, puis à les consommer depuis les écrans avec des hooks pour garder une architecture lisible.
- J'ai compris l'importance de gérer les états asynchrones (`chargement`, `succès`, `erreur`) afin de rendre le parcours utilisateur plus fiable.
- J'ai progressé dans la séparation des responsabilités entre composants UI, hooks, services, types et styles pour rendre le code maintenable.
- J'ai amélioré ma capacité à diagnostiquer une régression en suivant la chaîne : appel API -> mutation d'état -> re-render.
- J'ai retenu la nécessité de normaliser les données et de valider les entrées avant affichage.
- J'ai confirmé la valeur d'une architecture modulaire et de composants réutilisables pour faire évoluer sereinement l'application.

---

## Tests et validation

```bash
cd frontend
npm run typecheck        # TypeScript strict
npm test                 # Vitest
npm run lint:architecture # regles locales (voir frontend/docs/ADR/0001-frontend-architecture.md)
npm run validate         # les trois d'un coup
```

Regles d'architecture appliquees : aucun `any`, aucun `fetch` hors
`services/api/`, aucune URL d'API dans `app/` ou `components/`, aucun
fichier applicatif au-dela de 250 lignes.

## Documentation complementaire

- [`api-books-v2/README.md`](api-books-v2/README.md) — reference complete de l'API.
- [`frontend/README.md`](frontend/README.md) — details techniques du frontend.
- [`frontend/docs/ADR/0001-frontend-architecture.md`](frontend/docs/ADR/0001-frontend-architecture.md) — organisation du code frontend.
- [`frontend/docs/ADR/003-resolution-conflits.md`](frontend/docs/ADR/003-resolution-conflits.md) — strategie de resolution des conflits.
- [`frontend/docs/PERFORMANCE.md`](frontend/docs/PERFORMANCE.md) — optimisation de la liste des ouvrages.
