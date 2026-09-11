// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import type { Book } from "../domain/books/book";
import { bookKeys } from "../features/books/bookQueryKeys";
import {
  creerNoteHorsLigne,
  creerOuvrageHorsLigne,
  estIdProvisoire,
  insererOuvrageDansListes,
  retirerOuvrageDesListes,
  supprimerNoteHorsLigne
} from "../features/books/offlineBookMutations";
import { obtenirFileMutations, reinitialiserFileMutationsPourTests } from "../services/sync/mutationQueue";
import type { BooksPage } from "../services/api/schemas";

describe("offlineBookMutations", () => {
  beforeEach(() => {
    reinitialiserFileMutationsPourTests();
  });

  it("creates a provisional book and enqueues a matching creation mutation", () => {
    const livre = creerOuvrageHorsLigne({ titre: "Dune", auteur: "Frank Herbert", annee: 1965 });

    expect(estIdProvisoire(livre.id)).toBe(true);
    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    expect(file[0]).toMatchObject({ id: livre.id, cible: "ouvrage", mutation: { nature: "creation" } });
  });

  it("splices a newly created offline book into every cached list page", () => {
    const queryClient = new QueryClient();
    const page: BooksPage = { items: [], page: 1, limit: 20, total: 0, totalPages: 1 };
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), page);

    const livre = creerOuvrageHorsLigne({ titre: "Dune", auteur: "Frank Herbert", annee: 1965 });
    insererOuvrageDansListes(queryClient, livre);

    const updated = queryClient.getQueryData<BooksPage>(bookKeys.list({ page: 1, limit: 20 }));
    expect(updated?.items).toEqual([livre]);
    expect(updated?.total).toBe(1);
  });

  it("removes a book from every cached list page on offline deletion", () => {
    const queryClient = new QueryClient();
    const book: Book = {
      id: "book-1",
      titre: "Dune",
      auteur: "Frank Herbert",
      editeur: "",
      annee: 1965,
      lu: false,
      favori: false,
      note: null,
      couverture: null,
      createdAt: "x",
      updatedAt: "x",
      version: 1
    };
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), {
      items: [book],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    } satisfies BooksPage);

    retirerOuvrageDesListes(queryClient, book.id);

    const updated = queryClient.getQueryData<BooksPage>(bookKeys.list({ page: 1, limit: 20 }));
    expect(updated?.items).toEqual([]);
    expect(updated?.total).toBe(0);
  });

  it("cancels the pending creation instead of queuing a delete when a never-synced note is removed", () => {
    const note = creerNoteHorsLigne("book-1", "Brouillon");
    expect(obtenirFileMutations()).toHaveLength(1);

    supprimerNoteHorsLigne("book-1", note.id);

    expect(obtenirFileMutations()).toHaveLength(0);
  });

  it("queues a real deletion mutation for a note that already exists on the server", () => {
    supprimerNoteHorsLigne("book-1", "serveur-note-1");

    const file = obtenirFileMutations();
    expect(file).toHaveLength(1);
    expect(file[0]).toMatchObject({ cible: "note", mutation: { nature: "suppression", noteId: "serveur-note-1" } });
  });
});
