# API BookList Pro - v2

API Express fournie pour l'évaluation finale React Native **niveau M2**.
Elle remplace la v1 (`MaDesOcr/API-BOOKS`) et ajoute : pagination et filtrage serveur,
versionnement des ressources, synchronisation par lot, statistiques, authentification JWT,
et un mode dégradé « chaos ».

---

## Démarrage

```bash
npm install
npm run seed          # génère 500 livres, 2 comptes utilisateurs
npm start             # http://localhost:3000
```

Vérification : <http://localhost:3000/health>

### Scripts disponibles

| Commande | Effet |
|---|---|
| `npm start` | Serveur normal, **authentification désactivée** (paliers 10 → 16) |
| `npm run seed` | Régénère la base : 500 livres |
| `npm run seed:small` | 50 livres, pour le développement |
| `npm run auth` | Serveur avec **authentification obligatoire** (palier 18) |
| `npm run chaos` | Serveur en mode dégradé (latence 1,5 s, 30 % d'échecs) |
| `npm run final` | Auth + chaos : **les conditions de l'évaluation** |
| `npm run test:api` | Test de fumée de toutes les routes |

### Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port d'écoute |
| `AUTH_REQUIRED` | `false` | Active l'authentification et les rôles |
| `ACCESS_TOKEN_TTL` | `120s` | Durée de vie du jeton d'accès — volontairement courte |
| `REFRESH_TOKEN_TTL` | `7d` | Durée de vie du jeton de rafraîchissement |
| `CHAOS_LATENCE` | `0` | Latence artificielle en ms (+ jitter de 40 %) |
| `CHAOS_ECHEC` | `0` | Probabilité de réponse 503, entre 0 et 1 |
| `CHAOS_AUTH` | `false` | Applique aussi le chaos aux routes `/auth` |
| `JWT_SECRET` | valeur de dev | Secret de signature |

> Le mode chaos épargne `/auth` par défaut : sinon la reconnexion devient elle-même aléatoire et
> le débogage impossible.

---

## Modèle de données

```ts
type Livre = {
  id: string;            // uuid
  titre: string;
  auteur: string;
  editeur: string;
  annee: number;         // 1450 → année prochaine
  lu: boolean;
  favori: boolean;
  note: number | null;   // 0 à 5
  couverture: string | null;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  version: number;       // incrémenté à chaque écriture
};

type Note = {
  id: string;
  livreId: string;
  contenu: string;       // 1000 caractères max
  createdAt: string;
};
```

**Différence avec la v1** : le champ s'appelle `titre` (et non `nom`), et `GET /books` renvoie
un objet paginé, pas un tableau.

---

## Routes

### Santé

```
GET /health
→ { statut, version, authRequise, chaos: { latence, tauxEchec }, livres, notes }
```

### Livres

```
GET /books?page=1&limit=20&q=&status=lu|nonlu&favori=true|false&auteur=&sort=&order=
```

| Paramètre | Valeurs | Défaut |
|---|---|---|
| `page` | ≥ 1 | 1 |
| `limit` | 1 à 100 (plafonné) | 20 |
| `q` | recherche titre + auteur, insensible aux accents | — |
| `status` | `lu`, `nonlu` | — |
| `favori` | `true`, `false` | — |
| `sort` | `titre`, `auteur`, `annee`, `note`, `updatedAt` | `titre` |
| `order` | `asc`, `desc` | `asc` |

```json
200 → {
  "items": [ … ],
  "page": 1,
  "limit": 20,
  "total": 500,
  "totalPages": 25
}
```

```
GET    /books/:id          → 200 Livre  (en-tête ETag = version)  |  404
POST   /books              → 201 Livre  |  422 { erreur, champs }
PUT    /books/:id          → 200 Livre  |  404  |  409  |  422
PATCH  /books/:id          → 200 Livre  (mise à jour partielle)
DELETE /books/:id          → 204  |  404
```

**PUT exige une représentation complète** (`titre`, `auteur`, `annee` obligatoires).
Pour une modification partielle — basculer `lu` ou `favori` — utilisez **PATCH**.

#### Détection de conflit

Envoyez l'en-tête `If-Match` avec la version que vous croyez à jour :

```
PUT /books/:id
If-Match: 3
```

- version identique → écriture acceptée, `version` incrémentée ;
- version périmée → **409** :

```json
{
  "erreur": "conflit",
  "message": "Ce livre a été modifié entre temps.",
  "serveur": { … livre actuel … },
  "versionAttendue": 7
}
```

- en-tête absent → écriture acceptée sans contrôle (le dernier écrivain gagne).
  Utile aux paliers 10 à 16 ; **inacceptable au palier 18**.

### Notes

```
GET    /books/:id/notes                 → 200 Note[]  (plus récente d'abord)
POST   /books/:id/notes  { contenu }    → 201 Note  |  422
DELETE /books/:livreId/notes/:noteId    → 204  |  404
```

### Statistiques

```
GET /stats
→ {
  total, lus, nonLus, favoris,
  moyenneNotes, totalNotes,
  distributionNotes: [ { note, total } ],
  parAnnee: [ { annee, total } ],
  parAuteur: [ { auteur, total } ],   // top 10
  genereLe
}
```

### Synchronisation par lot

```
POST /sync
{
  "mutations": [
    { "id": "uuid-client-1", "type": "create", "livre": { … } },
    { "id": "uuid-client-2", "type": "update", "baseVersion": 3, "livre": { "id": "…", … } },
    { "id": "uuid-client-3", "type": "delete", "livreId": "…", "baseVersion": 5 }
  ]
}
```

```json
200 → {
  "resultats": [
    { "id": "uuid-client-1", "statut": "ok", "livre": { … } },
    { "id": "uuid-client-2", "statut": "conflit", "serveur": { … }, "versionAttendue": 5 },
    { "id": "uuid-client-3", "statut": "erreur", "message": "…" }
  ],
  "resume": { "total": 3, "ok": 1, "conflits": 1, "erreurs": 1 },
  "serveurLe": "2026-11-12T09:14:22.104Z"
}
```

Règles :

- les mutations sont traitées **dans l'ordre reçu** ;
- un conflit **n'interrompt pas** le lot ;
- **idempotence** : un `id` de mutation déjà traité renvoie son résultat mémorisé, avec
  `"rejeu": true`, sans réappliquer l'opération. Générez cet `id` côté client et **conservez-le**
  entre deux tentatives — c'est ce qui empêche les doublons après une coupure réseau ;
- supprimer un livre déjà absent renvoie `ok` (suppression idempotente) ;
- 200 mutations maximum par lot (`413` au-delà).

### Authentification — palier 18

Inactive par défaut. Activation : `npm run auth` ou `AUTH_REQUIRED=true`.

```
POST /auth/login    { email, motDePasse }
→ { accessToken, refreshToken, expiresIn, utilisateur: { id, email, role } }

POST /auth/refresh  { refreshToken }
→ { accessToken, expiresIn }

GET  /me            Authorization: Bearer <accessToken>
→ { id, email, role, authRequise }
```

Comptes créés par le seed :

| Email | Mot de passe | Rôle | Droits |
|---|---|---|---|
| `editeur@booklist.fr` | `editeur123` | `editeur` | lecture + écriture |
| `lecteur@booklist.fr` | `lecteur123` | `lecteur` | lecture seule |

Codes d'erreur d'authentification :

| Code | `erreur` | Signification |
|---|---|---|
| 401 | `jeton_absent` | En-tête `Authorization` manquant |
| 401 | `jeton_expire` | Jeton d'accès expiré → **rafraîchissez et rejouez la requête** |
| 401 | `jeton_invalide` | Signature invalide ou utilisateur inconnu |
| 403 | `droits_insuffisants` | Rôle `lecteur` sur une route d'écriture |

`ACCESS_TOKEN_TTL` vaut 120 s par défaut : l'expiration survient **pendant** votre démonstration.
C'est voulu. Votre intercepteur doit la traiter sans que l'utilisateur ne s'en aperçoive, et ne
déclencher **qu'un seul** rafraîchissement même si dix requêtes prennent un 401 simultanément.

---

## Format des erreurs

Toutes les erreurs suivent la même forme :

```json
{ "erreur": "code_machine", "message": "Phrase lisible.", "champs": { "titre": "…" } }
```

| Code HTTP | Quand |
|---|---|
| 400 | JSON illisible |
| 401 / 403 | Authentification / autorisation |
| 404 | Ressource ou route inconnue |
| 409 | Conflit de version |
| 413 | Lot de synchronisation trop grand |
| 422 | Validation métier (`champs` détaille chaque champ fautif) |
| 503 | Mode chaos |

Traitez `422` (afficher les erreurs par champ) et `503` (réessayer) **différemment**.

---

## Mode chaos

```bash
CHAOS_LATENCE=1500 CHAOS_ECHEC=0.3 npm start
```

Chaque requête est retardée de `CHAOS_LATENCE` ms (± 40 % de jitter) et a `CHAOS_ECHEC` chances
sur 1 d'être rejetée en 503. **L'évaluation se déroule dans ce mode.**

Ce qu'il révèle immédiatement :

- l'absence de délai d'expiration côté client ;
- les mises à jour optimistes sans retour arrière ;
- les indicateurs de chargement bloquants ;
- les doubles soumissions ;
- la perte de saisie utilisateur ;
- les réessais sans temporisation, qui aggravent la panne.

---

## Persistance

Les données sont écrites dans `data/db.json` (écriture atomique, sérialisée).
Pour repartir de zéro : `npm run seed`.
Ce fichier est ignoré par Git : chaque poste a sa propre base.

---

## Scénario de recette de l'évaluation

À rejouer par le formateur pendant la soutenance, application en mode hors ligne :

```bash
# 1. Relever la version courante d'un livre
curl -s http://localhost:3000/books?limit=1 | head -c 400

# 2. Pendant que l'étudiant modifie ce livre hors ligne, le modifier côté serveur
curl -X PATCH http://localhost:3000/books/<ID> \
  -H "Content-Type: application/json" \
  -d '{"titre":"Modifié par le serveur"}'

# 3. L'étudiant rétablit le réseau : sa synchronisation doit remonter un conflit,
#    l'appliquer selon la stratégie annoncée, et ne rien perdre.
```

---

## Extension attendue côté étudiant

L'API est fournie complète. Ce qui reste à votre charge :

1. **Le client**, évidemment.
2. Toute route supplémentaire dont votre application aurait besoin — à justifier en ADR.
3. Si vous modifiez cette API, versionnez vos changements et documentez-les dans un
   `CHANGELOG.md` : un correcteur doit pouvoir lancer votre client contre **votre** API.

Signalez tout bug à votre formateur.
