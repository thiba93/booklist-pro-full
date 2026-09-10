// @vitest-environment jsdom
import { Profiler } from "react";
import type { ProfilerOnRenderCallback } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import type { Book } from "../domain/books/book";
import { BookRows } from "../features/books/BookListParts";
import { AppProviders } from "./testProviders";

const BOOK_COUNT = 200;

function makeBooks(count: number): Book[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `book-${index}`,
    titre: `Titre ${index}`,
    auteur: `Auteur ${index}`,
    editeur: "Editeur",
    annee: 2000 + (index % 20),
    lu: false,
    favori: false,
    note: null,
    couverture: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1
  }));
}

const noop = () => undefined;

describe("BookRows performance", () => {
  it("re-renders far less than a full subtree pass when a single row changes", async () => {
    const books = makeBooks(BOOK_COUNT);
    const renders: { actualDuration: number; baseDuration: number }[] = [];
    const onRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration, baseDuration) => {
      renders.push({ actualDuration, baseDuration });
    };

    let renderer: ReturnType<typeof create> | undefined;

    await act(async () => {
      renderer = create(
        <AppProviders>
          <Profiler id="bookRows" onRender={onRender}>
            <BookRows
              books={books}
              onOpenBook={noop}
              onToggleFavorite={noop}
              onToggleRead={noop}
            />
          </Profiler>
        </AppProviders>
      );
    });

    renders.length = 0; // ignore the initial mount, only the targeted update matters

    // Simulate a single optimistic patch (as usePatchBook.applyPatch does):
    // only the changed book gets a new object reference, every other one
    // keeps its previous reference.
    const updated = books.map((book, index) => (index === 0 ? { ...book, lu: true } : book));

    await act(async () => {
      renderer?.update(
        <AppProviders>
          <Profiler id="bookRows" onRender={onRender}>
            <BookRows
              books={updated}
              onOpenBook={noop}
              onToggleFavorite={noop}
              onToggleRead={noop}
            />
          </Profiler>
        </AppProviders>
      );
    });

    const [update] = renders;
    if (!update) {
      throw new Error("Profiler n'a rapporte aucun rendu pour la mise a jour ciblee");
    }

    console.log(
      `[BookRows perf] ${BOOK_COUNT} lignes, 1 modifiee — actualDuration=${update.actualDuration.toFixed(3)}ms baseDuration=${update.baseDuration.toFixed(3)}ms`
    );

    // baseDuration estime le cout si React devait tout re-rendre (aucun
    // memo) ; actualDuration est le cout reel du commit avec BookRow
    // memoise. Le memo doit rendre le second nettement plus petit.
    expect(update.actualDuration).toBeLessThan(update.baseDuration * 0.5);
  });
});
