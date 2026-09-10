import { z } from "zod";

const TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const SUBJECT_LIMIT = 5;

const openLibraryDocSchema = z.object({
  first_publish_year: z.number().optional(),
  subject: z.array(z.string()).optional()
});

const openLibraryResponseSchema = z.object({
  docs: z.array(openLibraryDocSchema)
});

export type OpenLibraryEnrichment = {
  premierePublication: number | null;
  sujets: readonly string[];
};

type CacheEntry = { data: OpenLibraryEnrichment | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cleCache(titre: string, auteur: string) {
  return `${titre.trim().toLowerCase()}|${auteur.trim().toLowerCase()}`;
}

/**
 * Enrichissement optionnel depuis OpenLibrary : protege par un cache en
 * memoire, un timeout court et une degradation silencieuse. N'importe
 * quel echec (reseau, timeout, reponse invalide) renvoie null plutot que
 * de rejeter la promesse, afin de ne jamais casser la fiche d'un ouvrage.
 */
export async function fetchOpenLibraryEnrichment(
  titre: string,
  auteur: string
): Promise<OpenLibraryEnrichment | null> {
  const cle = cleCache(titre, auteur);
  const enCache = cache.get(cle);

  if (enCache && enCache.expiresAt > Date.now()) {
    return enCache.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const params = new URLSearchParams({ title: titre, author: auteur, limit: "1" });
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("reponse_openlibrary_invalide");
    }

    const body: unknown = await response.json();
    const analyse = openLibraryResponseSchema.safeParse(body);
    const premierDoc = analyse.success ? analyse.data.docs[0] : undefined;

    const enrichissement: OpenLibraryEnrichment | null = premierDoc
      ? {
          premierePublication: premierDoc.first_publish_year ?? null,
          sujets: (premierDoc.subject ?? []).slice(0, SUBJECT_LIMIT)
        }
      : null;

    cache.set(cle, { data: enrichissement, expiresAt: Date.now() + CACHE_TTL_MS });
    return enrichissement;
  } catch {
    cache.set(cle, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
