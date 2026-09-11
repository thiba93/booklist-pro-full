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

  it("sends every pending book mutation in a single /sync batch and clears the ones the server accepted", async () => {
    enfilerCreationOuvrage("m1", { titre: "Dune", auteur: "Frank Herbert", annee: 1965 });
    enfilerModificationOuvrage("m2", "book-2", { titre: "Dune Messiah", auteur: "Frank Herbert", annee: 1969 }, 3);

    vi.mocked(syncBooks).mockResolvedValue({
      resultats: [
        { id: "m1", statut: "ok", livre: null },
        {
          id: "m2",
          statut: "conflit",
          serveur: {
            id: "book-2",
            titre: "Dune Messiah",
            auteur: "Frank Herbert",
            editeur: "",
            annee: 1969,
            lu: false,
            favori: false,
            note: null,
            couverture: null,
            createdAt: "x",
            updatedAt: "y",
            version: 4
          },
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
