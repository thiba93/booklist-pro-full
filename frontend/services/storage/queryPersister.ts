import type { QueryClient } from "@tanstack/react-query";

import { readPersistedValue, writePersistedValue } from "./persistedValue";

const CACHE_KEY = "booklistpro.query-cache";
// Regroupe les ecritures rapprochees (ex. plusieurs pages chargees en
// quelques secondes) en une seule serialisation/ecriture storage au lieu
// d'une par requete reussie.
const DEBOUNCE_MS = 500;
// Seules les cles de query commencant par "books" (voir bookQueryKeys.ts)
// sont persistees : stats/openLibrary/etc. n'ont pas besoin de survivre
// hors ligne et gonfleraient le cache inutilement.
const ESPACE_NOMS_PERSISTE = "books";

type EntreeCache = {
  queryKey: readonly unknown[];
  data: unknown;
};

function estPersistable(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === ESPACE_NOMS_PERSISTE;
}

/**
 * Cache local persistant : au demarrage, rejoue dans React Query les
 * dernieres reponses reussies pour les ouvrages, afin que la liste et les
 * fiches restent consultables hors ligne des le premier rendu.
 */
export async function hydrateQueryClient(queryClient: QueryClient): Promise<void> {
  const brut = await readPersistedValue(CACHE_KEY);

  if (!brut) {
    return;
  }

  try {
    const entrees = JSON.parse(brut) as EntreeCache[];
    entrees.forEach((entree) => {
      queryClient.setQueryData(entree.queryKey as unknown[], entree.data);
    });
  } catch {
    // Cache corrompu ou format obsolete : ignore, l'app repart du reseau.
  }
}

/**
 * Persiste (avec un leger debounce) chaque succes de requete concernant les
 * ouvrages. Retourne une fonction d'arret a appeler au demontage.
 */
export function persistQueryClient(queryClient: QueryClient): () => void {
  let minuteur: ReturnType<typeof setTimeout> | null = null;

  const ecrire = () => {
    const entrees: EntreeCache[] = queryClient
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          estPersistable(query.queryKey) &&
          query.state.status === "success" &&
          query.state.data !== undefined
      )
      .map((query) => ({ queryKey: query.queryKey, data: query.state.data }));

    void writePersistedValue(CACHE_KEY, JSON.stringify(entrees));
  };

  // Le cache de queries notifie sur CHAQUE evenement (ajout, mise a jour,
  // suppression, changement d'observateur...) : on ne filtre pas ici,
  // `ecrire` relit et refiltre l'etat complet a chaque declenchement, donc
  // un evenement non pertinent produit juste une re-ecriture identique
  // (debounced, donc peu couteuse).
  const desabonner = queryClient.getQueryCache().subscribe(() => {
    if (minuteur) {
      clearTimeout(minuteur);
    }
    minuteur = setTimeout(ecrire, DEBOUNCE_MS);
  });

  return () => {
    if (minuteur) {
      clearTimeout(minuteur);
    }
    desabonner();
  };
}
