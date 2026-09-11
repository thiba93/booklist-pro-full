// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Book } from "../domain/books/book";
import { bookKeys } from "../features/books/bookQueryKeys";
import { useCreateBook, useDeleteBook, usePatchBook } from "../features/books/useBooksQueries";
import { createBook, deleteBook, patchBook } from "../services/api/booksApi";
import type { BooksPage } from "../services/api/schemas";
import { obtenirFileMutations, reinitialiserFileMutationsPourTests } from "../services/sync/mutationQueue";

vi.mock("../services/api/booksApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/booksApi")>(
    "../services/api/booksApi"
  );

  return { ...actual, createBook: vi.fn(), deleteBook: vi.fn(), patchBook: vi.fn() };
});

const book: Book = {
  id: "book-1",
  titre: "Dune",
  auteur: "Frank Herbert",
  editeur: "Ace",
  annee: 1965,
  lu: false,
  favori: false,
  note: null,
  couverture: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  version: 1
};

function createClient() {
  // networkMode "always" sur les mutations reproduit la config reelle de
  // l'app (voir app/AppShell.tsx) : sans lui, React Query met lui-meme en
  // pause toute mutation des qu'un evenement "offline" du navigateur est
  // emis, et mutationFn (donc toute la logique offline ci-dessous) n'est
  // jamais execute - un vrai bug deja rencontre en manuel. Les queries
  // gardent le mode par defaut ("online").
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
      queries: { retry: false }
    }
  });
}

function Wrapper({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function waitUntil(assertion: () => void) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 1000) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  assertion();
}

describe("offline-aware book mutations", () => {
  beforeEach(() => {
    reinitialiserFileMutationsPourTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps a favorite toggle applied while offline instead of rolling it back", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const queryClient = createClient();
    queryClient.setQueryData(bookKeys.detail(book.id), book);
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), {
      items: [book],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    } satisfies BooksPage);

    let mutation: ReturnType<typeof usePatchBook> | null = null;
    function TestComponent() {
      mutation = usePatchBook();
      return null;
    }

    await act(async () => {
      create(
        <Wrapper queryClient={queryClient}>
          <TestComponent />
        </Wrapper>
      );
    });

    act(() => {
      mutation?.mutate({ id: book.id, payload: { favori: true } });
    });

    await waitUntil(() => expect(mutation?.isSuccess).toBe(true));

    expect(patchBook).not.toHaveBeenCalled();
    expect(queryClient.getQueryData<Book>(bookKeys.detail(book.id))?.favori).toBe(true);
    expect(obtenirFileMutations()).toHaveLength(1);
  });

  it("creates a book offline, shows it immediately in the list, and enqueues it for later sync", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const queryClient = createClient();
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    } satisfies BooksPage);

    let mutation: ReturnType<typeof useCreateBook> | null = null;
    function TestComponent() {
      mutation = useCreateBook();
      return null;
    }

    await act(async () => {
      create(
        <Wrapper queryClient={queryClient}>
          <TestComponent />
        </Wrapper>
      );
    });

    act(() => {
      mutation?.mutate({ titre: "Nouveau", auteur: "Auteur", annee: 2024 });
    });

    await waitUntil(() => expect(mutation?.isSuccess).toBe(true));

    expect(createBook).not.toHaveBeenCalled();
    const page = queryClient.getQueryData<BooksPage>(bookKeys.list({ page: 1, limit: 20 }));
    expect(page?.items).toHaveLength(1);
    expect(page?.items[0]?.titre).toBe("Nouveau");
    expect(obtenirFileMutations()).toHaveLength(1);
  });

  it("removes a book from the list when deleted offline, without calling the network", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const queryClient = createClient();
    queryClient.setQueryData(bookKeys.detail(book.id), book);
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), {
      items: [book],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    } satisfies BooksPage);

    let mutation: ReturnType<typeof useDeleteBook> | null = null;
    function TestComponent() {
      mutation = useDeleteBook();
      return null;
    }

    await act(async () => {
      create(
        <Wrapper queryClient={queryClient}>
          <TestComponent />
        </Wrapper>
      );
    });

    act(() => {
      mutation?.mutate(book.id);
    });

    await waitUntil(() => expect(mutation?.isSuccess).toBe(true));

    expect(deleteBook).not.toHaveBeenCalled();
    const page = queryClient.getQueryData<BooksPage>(bookKeys.list({ page: 1, limit: 20 }));
    expect(page?.items).toHaveLength(0);
    expect(obtenirFileMutations()).toHaveLength(1);
  });
});
