// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  chargerFileMutations,
  ecouterFileMutations,
  enfilerCreationOuvrage,
  enfilerModificationOuvrage,
  enfilerSuppressionOuvrage,
  marquerStatutMutation,
  obtenirFileMutations,
  rebaserMutationOuvrage,
  reinitialiserFileMutationsPourTests,
  retirerMutation
} from "../services/sync/mutationQueue";

const payload = { titre: "Dune", auteur: "Frank Herbert", annee: 1965 };

describe("mutationQueue", () => {
  beforeEach(() => {
    reinitialiserFileMutationsPourTests();
  });

  it("enqueues, notifies subscribers, and removes by id", () => {
    const notifications: number[] = [];
    const arreter = ecouterFileMutations((file) => notifications.push(file.length));

    enfilerCreationOuvrage("m1", payload);
    expect(obtenirFileMutations()).toHaveLength(1);
    expect(obtenirFileMutations()[0]).toMatchObject({ id: "m1", cible: "ouvrage", statut: "en_attente" });

    retirerMutation("m1");
    expect(obtenirFileMutations()).toHaveLength(0);
    expect(notifications).toEqual([1, 0]);

    arreter();
  });

  it("updates a mutation's status without touching the others", () => {
    enfilerCreationOuvrage("m1", payload);
    enfilerSuppressionOuvrage("m2", "book-1", 3);

    marquerStatutMutation("m1", "conflit", { serveur: { id: "book-1" }, versionAttendue: 4 });

    const file = obtenirFileMutations();
    expect(file.find((m) => m.id === "m1")).toMatchObject({ statut: "conflit", versionAttendue: 4 });
    expect(file.find((m) => m.id === "m2")).toMatchObject({ statut: "en_attente" });
  });

  it("folds a second offline edit of the same book into the pending modification instead of queuing a new one", () => {
    enfilerModificationOuvrage("m1", "book-1", { titre: "Dune", auteur: "F. Herbert", annee: 1965, lu: true }, 3);
    enfilerModificationOuvrage("m2", "book-1", { titre: "Dune", auteur: "F. Herbert", annee: 1965, favori: true }, 3);

    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    expect(file[0]).toMatchObject({
      id: "m1",
      mutation: { nature: "modification", baseVersion: 3, payload: { lu: true, favori: true } }
    });
  });

  it("folds an offline edit of a never-synced creation into the creation payload, keeping a single mutation", () => {
    enfilerCreationOuvrage("m1", { titre: "Dune", auteur: "F. Herbert", annee: 1965 });
    enfilerModificationOuvrage("m2", "m1", { titre: "Dune", auteur: "F. Herbert", annee: 1965, lu: true }, 0);

    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    expect(file[0]).toMatchObject({
      id: "m1",
      mutation: { nature: "creation", payload: { titre: "Dune", lu: true } }
    });
  });

  it("cancels a never-synced creation instead of queuing a delete for it", () => {
    enfilerCreationOuvrage("m1", { titre: "Dune", auteur: "F. Herbert", annee: 1965 });
    enfilerSuppressionOuvrage("m2", "m1", 0);

    expect(obtenirFileMutations()).toHaveLength(0);
  });

  it("drops a superseded pending modification when the book is then deleted offline", () => {
    enfilerModificationOuvrage("m1", "book-1", { titre: "Dune", auteur: "F. Herbert", annee: 1965 }, 3);
    enfilerSuppressionOuvrage("m2", "book-1", 3);

    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    expect(file[0]).toMatchObject({ id: "m2", mutation: { nature: "suppression" } });
  });

  it("rebases a conflicted modification onto the server version, resets it to pending, and gives it a fresh id", () => {
    enfilerModificationOuvrage("m1", "book-1", { titre: "Dune", auteur: "F. Herbert", annee: 1965 }, 3);
    marquerStatutMutation("m1", "conflit", { versionAttendue: 4 });

    rebaserMutationOuvrage("m1", 4);

    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    // Un nouvel id est genere (voir rebaserMutationOuvrage) : renvoyer le
    // meme id ferait rejouer le resultat de conflit deja memorise cote
    // serveur au lieu de re-evaluer le nouveau baseVersion.
    expect(file[0]?.id).not.toBe("m1");
    expect(file[0]).toMatchObject({
      statut: "en_attente",
      mutation: { nature: "modification", baseVersion: 4 }
    });
  });

  it("does nothing when asked to rebase a creation (no server version to rebase onto)", () => {
    enfilerCreationOuvrage("m1", payload);

    rebaserMutationOuvrage("m1", 4);

    expect(obtenirFileMutations()[0]).toMatchObject({ mutation: { nature: "creation" } });
  });

  it("survives a reload: persisted mutations are restored via chargerFileMutations", async () => {
    enfilerCreationOuvrage("m1", payload);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simule un redemarrage de l'app : la file en memoire est videe mais
    // pas le storage sous-jacent (reinitialiserFileMutationsPourTests ne
    // touche que l'etat en memoire pour ce test).
    reinitialiserFileMutationsPourTests();
    expect(obtenirFileMutations()).toHaveLength(0);

    await chargerFileMutations();
    expect(obtenirFileMutations()).toHaveLength(1);
    expect(obtenirFileMutations()[0]?.id).toBe("m1");
  });
});
