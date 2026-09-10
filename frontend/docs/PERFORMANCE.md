# Performance - liste des ouvrages

## Contexte

La liste des ouvrages (`BookListScreen` / `BookRows`) affiche jusqu'a
`booksPageSize` (20) lignes par page cote serveur, mais chaque ligne reste
soumise a des re-rendus frequents : bascule favori/lu (mise a jour
optimiste), recherche debattue (debounce), tri, changement de theme ou de
langue. Sans precaution, un changement isole (ex : cocher "lu" sur un seul
livre) re-rendait l'integralite des lignes de la page a chaque fois que
`BookListScreen` re-rendait.

## Optimisations appliquees

1. **`BookRow` memoise** (`features/books/BookListParts.tsx`) : chaque ligne
   est un composant `React.memo` independant. Dans `usePatchBook`
   (`features/books/useBooksQueries.ts`), la mise a jour optimiste
   (`applyPatch`) ne remplace que l'objet `Book` du livre modifie dans le
   tableau `items` ; les autres livres conservent leur reference d'origine.
   Un `Book` inchange => memes props => `BookRow` saute son rendu.
2. **Callbacks stables** : `onToggleRead` / `onToggleFavorite` sont
   enveloppes dans `useCallback` dans `BookListScreen`, pour ne pas casser
   le memo a chaque rendu du parent (recherche, tri, etc.).
3. **Etat "en cours" par ligne** : `patchBook.isPending` est un flag global
   a la mutation ; `BookListScreen` le convertit en `pendingId` (l'id du
   livre concerne) puis `BookRows` calcule `isMutating = book.id ===
   pendingId` pour chaque ligne. Les lignes non concernees recoivent
   toujours `false`, une valeur stable qui ne casse pas le memo - alors
   qu'un booleen global aurait rendu **toutes** les lignes "busy" pendant
   la mutation d'une seule.

## Mesure avant / apres

Le memoique est verifie par un test automatise et reproductible :
[`__tests__/bookRowsPerformance.test.tsx`](../__tests__/bookRowsPerformance.test.tsx).

Methode : on enveloppe `BookRows` (200 livres) dans un `<Profiler>` React
et on applique une mise a jour qui ne change qu'un seul livre (meme
mecanisme que `usePatchBook.applyPatch`). Le `Profiler` rapporte deux
valeurs pour le commit :

- `baseDuration` : estimation du temps necessaire pour re-rendre tout le
  sous-arbre **sans memoisation** (calculee par React a partir du dernier
  rendu mesure de chaque composant) - c'est notre "avant".
- `actualDuration` : temps reellement passe a rendre le commit, avec
  `BookRow` memoise - c'est notre "apres" (les lignes qui bail out
  n'ajoutent quasiment rien a ce total).

Executer la mesure :

```bash
npx vitest run __tests__/bookRowsPerformance.test.tsx
```

Resultats mesures (200 lignes, 1 modifiee), trois executions successives
sur la machine de developpement :

| Execution | actualDuration (apres) | baseDuration (avant) | Facteur |
| --------- | ----------------------: | ---------------------: | ------: |
| 1         | 8.01 ms                | 336.14 ms              | ~42x    |
| 2         | 7.46 ms                | 418.19 ms              | ~56x    |
| 3         | 7.93 ms                | 330.25 ms              | ~42x    |
| 4         | 7.67 ms                | 302.45 ms              | ~39x    |

Les valeurs absolues varient avec la charge de la machine (c'est pour cela
que le test compare `actualDuration` a `baseDuration` sur le meme commit
plutot qu'a un seuil fixe), mais le rapport reste stable : avec 200 lignes
et une seule modifiee, le memo divise le cout de rendu par un facteur
d'environ 40 a 55. Le test echoue si `actualDuration` depasse la moitie de
`baseDuration`, ce qui sert de garde-fou de non-regression.

## Pourquoi pas un simple compteur de rendus

Un compteur de rendus (ex : `console.count` dans `BookRow`) aurait
necessite d'instrumenter le composant de production pour les besoins du
test. Le `Profiler` de React est concu precisement pour ce type de mesure
et ne demande aucune modification du code applicatif : il suffit
d'envelopper l'arbre a mesurer, en test comme en profilage manuel via les
DevTools React en developpement.
