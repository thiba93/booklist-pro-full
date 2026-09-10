import { apiConfig } from "../api/apiConfig";

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * Fonction unique de resolution des URLs de couverture.
 *
 * - une URL absolue (http/https) est utilisee telle quelle ;
 * - un chemin relatif connu (/covers/:id.svg, /media/:id.png) est prefixe
 *   par l'URL de l'API ;
 * - une couverture absente (null) retombe sur la vignette de substitution
 *   /covers/:id.svg, elle aussi prefixee par l'URL de l'API.
 */
export function resolveCoverUrl(couverture: string | null, bookId: string): string {
  if (couverture && ABSOLUTE_URL_PATTERN.test(couverture)) {
    return couverture;
  }

  const baseUrl = apiConfig.baseUrl.replace(/\/$/, "");
  const chemin = couverture && couverture.startsWith("/") ? couverture : `/covers/${bookId}.svg`;

  return `${baseUrl}${chemin}`;
}
