# ADR 003 - Resolution des conflits de synchronisation hors ligne

## Statut

Acceptee.

## Contexte

Le Lot 4 introduit une file de mutations persistee (`services/sync/mutationQueue.ts`)
pour permettre la creation, la modification et la suppression d'ouvrages et
de notes hors ligne. Au retour du reseau, les mutations sur les ouvrages
sont rejouees en un seul lot via `POST /sync` (voir
`services/sync/replaySync.ts`).

Ce lot est traite par le serveur avec un controle de version optimiste
(`baseVersion` compare a la version courante du livre). Si un autre client
(ou une reprise de session sur un autre appareil) a modifie le meme livre
entre-temps, le serveur renvoie `{ statut: "conflit", serveur, versionAttendue }`
au lieu d'appliquer la mutation. Il faut decider, pour chaque mutation en
conflit, si on l'abandonne ou si on la retente.

Les creations ne peuvent jamais entrer en conflit de version (le serveur
attribue toujours un id et une version 1 neufs) : seules les modifications
et les suppressions sont concernees.

## Decision

**Strategie retenue : la derniere intention connue l'emporte (last-write-wins),
comparee par horodatage.**

Chaque mutation hors ligne porte `creeLe`, l'horodatage (ISO-8601) auquel
l'utilisateur a formule son intention (toggle lu/favori, edition du
formulaire, suppression). Quand le serveur signale un conflit, il renvoie
aussi `serveur.updatedAt`, la derniere modification connue du livre cote
serveur. La fonction pure `deciderSortMutationConflit`
(`domain/sync/resolutionConflits.ts`) compare les deux :

- Si `mutation.creeLe > serveur.updatedAt` : l'intention locale est
  posterieure a ce que le serveur connaissait au moment de l'ecrire ->
  **reappliquer**. La mutation est rebasee sur `versionAttendue`
  (`rebaserMutationOuvrage`) et retentee immediatement (au plus une passe de
  rejeu supplementaire par cycle, pour eviter une boucle infinie en cas de
  conflits en rafale).
- Sinon (le serveur a une modification plus recente que l'intention locale,
  ou egalite stricte des horodatages) : **abandonner**. La mutation est
  marquee `statut: "conflit"` - retiree de la file des mutations "en
  attente" mais conservee comme trace terminale, visible via le compteur
  de conflits de l'indicateur permanent. Le prochain refetch (declenche par
  `useSyncReplay` apres le rejeu) rapatrie l'etat serveur qui fait foi.

Cette decision est automatique : l'utilisateur n'est jamais bloque par une
boite de dialogue de resolution manuelle.

### Alternatives ecartees

- **Le serveur gagne toujours.** Plus simple, mais une edition hors ligne
  legitime et la plus recente serait systematiquement perdue des qu'un
  autre changement (meme ancien au moment de l'edition) a ete synchronise
  avant elle. Mauvaise experience hors ligne, contraire a l'esprit d'une
  app offline-first.
- **Le client gagne toujours.** Symetriquement dangereux : un appareil
  reste hors ligne longtemps, resynchronise, et ecrase silencieusement des
  changements plus recents faits ailleurs entre-temps.
- **Resolution manuelle (l'utilisateur choisit).** Plus sur mais plus
  couteux a construire (ecran dedie, blocage de la synchronisation en
  attendant une decision) et disproportionne pour ce projet ; peut etre
  ajoute plus tard en s'appuyant sur `deciderSortMutationConflit` comme
  simple valeur par defaut suggeree plutot que decision automatique.
- **Fusion champ par champ.** Impossible a faire correctement sans modele
  de fusion structuree (CRDT ou equivalent) ; hors de portee ici.

## Consequences

- Une mutation en conflit n'est jamais perdue silencieusement : elle finit
  soit rejouee avec succes (reappliquer), soit marquee `conflit` et gardee
  en file (abandonner), jamais simplement supprimee sans trace.
- Le nombre de mutations `conflit` s'accumule dans la file tant que rien ne
  les purge explicitement ; un ecran de revue/purge manuelle est un
  prolongement naturel mais non couvert par ce lot.
- La comparaison d'horodatages ISO-8601 fonctionne par ordre lexical (pas
  besoin de parser des `Date`), ce qui garde `deciderSortMutationConflit`
  pure et rapide a tester (`__tests__/resolutionConflits.test.ts`).
- Le rejeu en lot (`POST /sync`) reste idempotent cote serveur par id de
  mutation ; un rebase genere un **nouvel** envoi de la meme mutation avec
  un `baseVersion` mis a jour, pas une nouvelle mutation avec un nouvel id -
  la memoisation serveur ne s'applique donc pas au rebase (voulu : le
  premier envoi a echoue, ce n'est pas un rejeu de la meme requete).

### Limite constatee cote serveur : conflit deja memorise

Le serveur (`api-books-v2`, fourni separement, non modifie ici) memorise
chaque mutation traitee par son id (`db.mutationsTraitees`) pour rester
idempotent. Si l'id d'une mutation en conflit est renvoye au serveur une
seconde fois (ex. : le client la retente sans changer son id), la reponse
mémorisée est `{ statut: "conflit", rejeu: true, livre: null }` - **sans**
`serveur` ni `versionAttendue`, contrairement au premier essai. Un schema
qui exigeait ces deux champs faisait echouer la validation de toute la
reponse `/sync` (pas seulement de cette mutation), bloquant le lot entier
indefiniment - y compris les mutations acceptees a cote.

`syncResponseSchema` (`services/api/schemas.ts`) les accepte donc en
optionnel, et `rejouerOuvrages` traite leur absence comme un signal
"aucune decision fiable possible" : la mutation est marquee `conflit`
(abandon prudent) plutot que rebasee a l'aveugle sur une version inconnue.
Consequence pratique : une mutation qui a echoue une premiere fois sans
etre rebasee tout de suite (panne survenue entre les deux) ne beneficiera
plus jamais de la comparaison LWW si le meme id est renvoye plus tard -
seul le tout premier envoi d'un id porte l'information complete.
