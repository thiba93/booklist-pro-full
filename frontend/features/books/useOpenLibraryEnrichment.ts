import { useQuery } from "@tanstack/react-query";

import { fetchOpenLibraryEnrichment } from "../../services/api/openLibraryApi";

const STALE_TIME_MS = 10 * 60 * 1000;

/**
 * fetchOpenLibraryEnrichment ne rejette jamais (voir openLibraryApi.ts) :
 * cette requete ne passe donc jamais en isError, seul `data` peut etre
 * null. C'est ce qui garantit que l'enrichissement ne casse jamais la
 * fiche d'un ouvrage.
 */
export function useOpenLibraryEnrichment(titre: string, auteur: string, enabled: boolean) {
  return useQuery({
    queryKey: ["openLibrary", titre, auteur],
    queryFn: () => fetchOpenLibraryEnrichment(titre, auteur),
    enabled,
    retry: false,
    staleTime: STALE_TIME_MS
  });
}
