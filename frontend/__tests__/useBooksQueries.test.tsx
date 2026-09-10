import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { Book } from "../domain/books/book";
import { bookKeys } from "../features/books/bookQueryKeys";
import { useBooksList, usePatchBook } from "../features/books/useBooksQueries";
import { getBooks, patchBook } from "../services/api/booksApi";
import type { BooksPage } from "../services/api/schemas";

vi.mock("../services/api/booksApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/booksApi")>(
    "../services/api/booksApi"
  );

  return {
    ...actual,
    getBooks: vi.fn(),
    patchBook: vi.fn()
  };
});

const book: Book = {
  id: "book-1",
  titre: "Dune",
  auteur: "Frank Herbert",
  editeur: "Ace",
  annee: 1965,
  lu: false,
  favori: false,
  note: 5,
  couverture: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  version: 1
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function Wrapper(props: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={props.queryClient}>{props.children}</QueryClientProvider>;
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

describe("useBooksQueries", () => {
  it("passes TanStack Query abort signal to the API", async () => {
    const getBooksMock = vi.mocked(getBooks);
    getBooksMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 });
    const queryClient = createClient();

    function TestComponent() {
      useBooksList({ page: 1, limit: 20, q: "dune" });
      return null;
    }

    await act(async () => {
      create(
        <Wrapper queryClient={queryClient}>
          <TestComponent />
        </Wrapper>
      );
    });

    await waitUntil(() => expect(getBooksMock).toHaveBeenCalled());
    expect(getBooksMock.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it("rolls back optimistic read status when the server rejects", async () => {
    const patchBookMock = vi.mocked(patchBook);
    let rejectPatch: (error: Error) => void = () => undefined;
    patchBookMock.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          rejectPatch = reject;
        })
    );
    const queryClient = createClient();
    const page: BooksPage = { items: [book], page: 1, limit: 20, total: 1, totalPages: 1 };
    let mutation: ReturnType<typeof usePatchBook> | null = null;

    queryClient.setQueryData(bookKeys.detail(book.id), book);
    queryClient.setQueryData(bookKeys.list({ page: 1, limit: 20 }), page);

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
      mutation?.mutate({ id: book.id, payload: { lu: true } });
    });

    await waitUntil(() => {
      expect(queryClient.getQueryData<Book>(bookKeys.detail(book.id))?.lu).toBe(true);
    });

    await act(async () => {
      rejectPatch(new Error("refused"));
    });

    await waitUntil(() => expect(mutation?.isError).toBe(true));
    expect(queryClient.getQueryData<Book>(bookKeys.detail(book.id))?.lu).toBe(false);
  });
});
