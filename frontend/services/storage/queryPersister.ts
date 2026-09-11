import type { QueryClient } from "@tanstack/react-query";

import { readPersistedValue, writePersistedValue } from "./persistedValue";

const CACHE_KEY = "booklistpro.query-cache";
const DEBOUNCE_MS = 500;
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
