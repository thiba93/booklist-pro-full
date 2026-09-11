// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bookKeys } from "../features/books/bookQueryKeys";
import { BookFormScreen } from "../features/books/BookFormScreen";
import { getBook, updateBook } from "../services/api/booksApi";
import { AppProviders } from "./testProviders";

vi.mock("../services/api/booksApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/booksApi")>(
    "../services/api/booksApi"
  );

  // getBook mocke aussi : sans lui, useBookDetail declenche un vrai appel
  // reseau en arriere-plan (staleTime 0) des le montage, meme si le cache
  // est deja pre-rempli - source de flakiness sans rapport avec ce test.
  return { ...actual, getBook: vi.fn(), updateBook: vi.fn() };
});

const book = {
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
  version: 3
};

const livreServeur = { ...book, titre: "Dune (edite ailleurs)", updatedAt: "2026-02-01T00:00:00.000Z", version: 4 };

function erreurConflit() {
  return Object.assign(new Error("Ce livre a ete modifie entre temps."), {
    type: "ErreurConflit",
    status: 409,
    code: "conflit",
    serveur: livreServeur,
    versionAttendue: 4
  });
}

function createClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  client.setQueryData(bookKeys.detail(book.id), book);
  return client;
}

function Wrapper({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <AppProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppProviders>
  );
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

describe("BookFormScreen online conflict (real 409)", () => {
  beforeEach(() => {
    vi.mocked(updateBook).mockReset();
    vi.mocked(getBook).mockResolvedValue(book);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the resolution panel on a 409 without losing the typed input, and 'keep server' cancels out", async () => {
    vi.mocked(updateBook).mockRejectedValue(erreurConflit());
    const onCancel = vi.fn();
    const onSaved = vi.fn();
    const queryClient = createClient();

    let screen: ReturnType<typeof create> | undefined;
    await act(async () => {
      screen = create(
        <Wrapper queryClient={queryClient}>
          <BookFormScreen id={book.id} mode="edit" onCancel={onCancel} onSaved={onSaved} />
        </Wrapper>
      );
    });

    const titreInput = screen?.root.findAllByProps({ value: "Dune" })[0];
    await act(async () => {
      titreInput?.props.onChangeText("Mon titre local");
    });

    await act(async () => {
      screen?.root.findByProps({ accessibilityLabel: "Enregistrer" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitUntil(() =>
      expect(
        screen?.root.findByProps({
          children:
            "\"Dune (edite ailleurs)\" a ete modifie ailleurs entre-temps. Votre modification hors ligne n'a pas ete appliquee."
        })
      ).toBeTruthy()
    );
    expect(onSaved).not.toHaveBeenCalled();

    act(() => {
      screen?.root.findByProps({ accessibilityLabel: "Garder la version du serveur" }).props.onPress();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("resubmits the same typed values with the server's versionAttendue when 'reapply' is pressed", async () => {
    vi.mocked(updateBook)
      .mockRejectedValueOnce(erreurConflit())
      .mockResolvedValueOnce({ ...book, titre: "Mon titre local", version: 5 });
    const onSaved = vi.fn();
    const queryClient = createClient();

    let screen: ReturnType<typeof create> | undefined;
    await act(async () => {
      screen = create(
        <Wrapper queryClient={queryClient}>
          <BookFormScreen id={book.id} mode="edit" onCancel={vi.fn()} onSaved={onSaved} />
        </Wrapper>
      );
    });

    const titreInput = screen?.root.findAllByProps({ value: "Dune" })[0];
    await act(async () => {
      titreInput?.props.onChangeText("Mon titre local");
    });

    await act(async () => {
      screen?.root.findByProps({ accessibilityLabel: "Enregistrer" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitUntil(() =>
      expect(screen?.root.findByProps({ accessibilityLabel: "Reappliquer ma modification" })).toBeTruthy()
    );

    await act(async () => {
      screen?.root.findByProps({ accessibilityLabel: "Reappliquer ma modification" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(updateBook).toHaveBeenCalledTimes(2);
    // Le deuxieme envoi porte la meme saisie (titre modifie localement) sur
    // la version renvoyee par le conflit (4), pas l'ancienne (3).
    expect(vi.mocked(updateBook).mock.calls[1]?.[1]).toMatchObject({ titre: "Mon titre local" });
    expect(vi.mocked(updateBook).mock.calls[1]?.[2]).toBe(4);
    await waitUntil(() => expect(onSaved).toHaveBeenCalledWith(book.id));
  });
});
