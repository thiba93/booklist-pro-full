// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBookNote, deleteBookNote } from "../services/api/booksApi";
import {
  enfilerCreationNote,
  enfilerCreationOuvrage,
  enfilerModificationOuvrage,
  obtenirFileMutations,
  reinitialiserFileMutationsPourTests
} from "../services/sync/mutationQueue";
import { rejouerFileMutations } from "../services/sync/replaySync";
import { syncBooks } from "../services/api/systemApi";

vi.mock("../services/api/booksApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/booksApi")>(
    "../services/api/booksApi"
  );

  return { ...actual, createBookNote: vi.fn(), deleteBookNote: vi.fn() };
});

vi.mock("../services/api/systemApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/systemApi")>(
    "../services/api/systemApi"
  );

  return { ...actual, syncBooks: vi.fn() };
});

function erreurReseau() {
  return Object.assign(new Error("hors ligne"), { type: "ErreurReseau", timeout: false });
}

describe("rejouerFileMutations", () => {
  beforeEach(() => {
    reinitialiserFileMutationsPourTests();
    vi.mocked(syncBooks).mockReset();
    vi.mocked(createBookNote).mockReset();
    vi.mocked(deleteBookNote).mockReset();
  });

  const livreServeur = {
    id: "book-2",
    titre: "Dune Messiah",
    auteur: "Frank Herbert",
    editeur: "",
    annee: 1969,
    lu: false,
    favori: false,
    note: null,
    couverture: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    version: 4
  };

  it("sends every pending book mutation in a single /sync batch, clears accepted ones, and abandons a conflicted one the server updated more recently", async () => {
    enfilerCreationOuvrage("m1", { titre: "Dune", auteur: "Frank Herbert", annee: 1965 });
    enfilerModificationOuvrage("m2", "book-2", { titre: "Dune Messiah", auteur: "Frank Herbert", annee: 1969 }, 3);

    vi.mocked(syncBooks).mockResolvedValue({
      resultats: [
        { id: "m1", statut: "ok", livre: null },
        {
          id: "m2",
          statut: "conflit",
          // Plus recent que "maintenant" (creeLe de m2) : le serveur gagne.
          serveur: { ...livreServeur, updatedAt: "2999-01-01T00:00:00.000Z" },
          versionAttendue: 4
        }
      ],
      resume: { total: 2, ok: 1, conflits: 1, erreurs: 0 },
      serveurLe: "2026-01-01T00:00:00.000Z"
    });

    await rejouerFileMutations();

    expect(syncBooks).toHaveBeenCalledTimes(1);
    const file = obtenirFileMutations();
    expect(file.find((m) => m.id === "m1")).toBeUndefined();
    expect(file.find((m) => m.id === "m2")).toMatchObject({ statut: "conflit", versionAttendue: 4 });
  });

  it("rebases (with a fresh id) and immediately retries a conflicted mutation more recent than the server's known update", async () => {
    enfilerModificationOuvrage("m1", "book-2", { titre: "Dune Messiah 2", auteur: "Frank Herbert", annee: 1969 }, 3);

    // Le deuxieme envoi porte un id different du premier (voir
    // rebaserMutationOuvrage) : la reponse mockee doit refleter l'id
    // REELLEMENT envoye plutot que de le fixer en dur, sinon le test ne
    // detecterait pas une regression qui reutiliserait "m1" (et rejouerait
    // alors le resultat memorise cote serveur - le vrai bug rencontre en
    // manuel, voir ADR 003).
    vi.mocked(syncBooks).mockImplementation(async (mutations) => {
      const idEnvoye = mutations[0]?.id ?? "";

      if (idEnvoye === "m1") {
        return {
          resultats: [
            {
              id: "m1",
              statut: "conflit",
              // Anterieur a "maintenant" (creeLe de m1) : l'intention locale gagne.
              serveur: { ...livreServeur, updatedAt: "2020-06-01T00:00:00.000Z" },
              versionAttendue: 4
            }
          ],
          resume: { total: 1, ok: 0, conflits: 1, erreurs: 0 },
          serveurLe: "2026-01-01T00:00:00.000Z"
        };
      }

      return {
        resultats: [{ id: idEnvoye, statut: "ok", livre: null }],
        resume: { total: 1, ok: 1, conflits: 0, erreurs: 0 },
        serveurLe: "2026-01-01T00:00:01.000Z"
      };
    });

    await rejouerFileMutations();

    expect(syncBooks).toHaveBeenCalledTimes(2);
    const idRebase = vi.mocked(syncBooks).mock.calls[1]?.[0][0]?.id;
    expect(idRebase).toBeDefined();
    expect(idRebase).not.toBe("m1");
    expect(vi.mocked(syncBooks).mock.calls[1]?.[0]).toMatchObject([{ baseVersion: 4 }]);
    expect(obtenirFileMutations()).toHaveLength(0);
  });

  it("abandons a replayed conflict missing serveur/versionAttendue instead of rebasing blindly (regression)", async () => {
    enfilerModificationOuvrage("m1", "book-2", { titre: "Dune Messiah 2", auteur: "Frank Herbert", annee: 1969 }, 3);

    vi.mocked(syncBooks).mockResolvedValue({
      resultats: [{ id: "m1", statut: "conflit", rejeu: true, livre: null }],
      resume: { total: 1, ok: 0, conflits: 1, erreurs: 0 },
      serveurLe: "2026-01-01T00:00:00.000Z"
    });

    await rejouerFileMutations();

    expect(syncBooks).toHaveBeenCalledTimes(1);
    expect(obtenirFileMutations().find((m) => m.id === "m1")).toMatchObject({ statut: "conflit" });
  });

  it("leaves the queue untouched when the batch call fails (retried on next reconnect)", async () => {
    enfilerCreationOuvrage("m1", { titre: "Dune", auteur: "Frank Herbert", annee: 1965 });
    vi.mocked(syncBooks).mockRejectedValue(erreurReseau());

    await rejouerFileMutations();

    expect(obtenirFileMutations()).toHaveLength(1);
  });

  it("replays note mutations sequentially and stops at the first network failure", async () => {
    enfilerCreationNote("n1", "book-1", "Premiere note");
    enfilerCreationNote("n2", "book-1", "Deuxieme note");

    vi.mocked(createBookNote)
      .mockResolvedValueOnce({ id: "srv-1", livreId: "book-1", contenu: "Premiere note", createdAt: "x" })
      .mockRejectedValueOnce(erreurReseau());

    await rejouerFileMutations();

    expect(createBookNote).toHaveBeenCalledTimes(2);
    const file = obtenirFileMutations();
    expect(file.find((m) => m.id === "n1")).toBeUndefined();
    expect(file.find((m) => m.id === "n2")).toMatchObject({ statut: "en_attente" });
  });

  it("marks a definitive (non-network) note failure as erreur and continues with the rest", async () => {
    enfilerCreationNote("n1", "book-1", "Premiere note");
    enfilerCreationNote("n2", "book-1", "Deuxieme note");

    vi.mocked(createBookNote)
      .mockRejectedValueOnce(Object.assign(new Error("422"), { type: "ErreurValidation", status: 422 }))
      .mockResolvedValueOnce({ id: "srv-2", livreId: "book-1", contenu: "Deuxieme note", createdAt: "x" });

    await rejouerFileMutations();

    const file = obtenirFileMutations();
    expect(file.find((m) => m.id === "n1")).toMatchObject({ statut: "erreur" });
    expect(file.find((m) => m.id === "n2")).toBeUndefined();
  });
});
