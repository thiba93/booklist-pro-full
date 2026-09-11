import { describe, expect, it } from "vitest";

import { syncResponseSchema } from "../services/api/schemas";

describe("syncResponseSchema", () => {
  it("accepts a fresh conflict result carrying the server's current book and expected version", () => {
    const result = syncResponseSchema.safeParse({
      resultats: [
        {
          id: "m1",
          statut: "conflit",
          serveur: {
            id: "book-1",
            titre: "Dune",
            auteur: "Frank Herbert",
            editeur: "",
            annee: 1965,
            lu: false,
            favori: false,
            note: null,
            couverture: null,
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-06-01T00:00:00.000Z",
            version: 4
          },
          versionAttendue: 4
        }
      ],
      resume: { total: 1, ok: 0, conflits: 1, erreurs: 0 },
      serveurLe: "2026-01-01T00:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  /**
   * Regression : POST /sync rejoue un conflit deja traite lors d'un envoi
   * precedent (mutation memorisee cote serveur) sans reponter la version
   * courante - il renvoie { rejeu: true, livre: null }, sans `serveur` ni
   * `versionAttendue`. Un schema qui exigeait ces deux champs faisait
   * echouer la validation de TOUTE la reponse (donc de tout le lot, y
   * compris les mutations acceptees a cote), bloquant la file pour
   * toujours. Voir docs/ADR/003-resolution-conflits.md.
   */
  it("accepts a replayed conflict result missing serveur/versionAttendue (already-memoized mutation)", () => {
    const result = syncResponseSchema.safeParse({
      resultats: [
        { id: "m1", statut: "conflit", rejeu: true, livre: null },
        { id: "m2", statut: "ok", livre: null }
      ],
      resume: { total: 2, ok: 1, conflits: 1, erreurs: 0 },
      serveurLe: "2026-01-01T00:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });
});
