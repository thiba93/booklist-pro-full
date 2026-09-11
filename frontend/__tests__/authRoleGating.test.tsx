// @vitest-environment jsdom
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { Book } from "../domain/books/book";
import { BookRows } from "../features/books/BookListParts";
import { AppProviders } from "./testProviders";

const book: Book = {
  id: "book-1",
  titre: "Dune",
  auteur: "Frank Herbert",
  editeur: "Ace",
  annee: 1965,
  lu: false,
  favori: true,
  note: 5,
  couverture: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  version: 1
};

describe("role-based write action gating", () => {
  it("hides write actions for the lecteur role", async () => {
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders authOverrides={{ canWrite: false }}>
          <BookRows
            books={[book]}
            canWrite={false}
            onOpenBook={vi.fn()}
            onToggleFavorite={vi.fn()}
            onToggleRead={vi.fn()}
          />
        </AppProviders>
      );
    });

    if (!screen) {
      throw new Error("Rendu indisponible");
    }

    expect(screen.root.findAllByProps({ accessibilityLabel: "Marquer lu" })).toHaveLength(0);
    expect(screen.root.findAllByProps({ accessibilityLabel: "Retirer des favoris" })).toHaveLength(0);
    // Le statut reste visible en lecture seule, seule l'action disparait.
    expect(screen.root.findByProps({ children: "Non lu" })).toBeTruthy();
    expect(screen.root.findByProps({ children: "♥" })).toBeTruthy();
  });

  it("shows write actions for the editeur role (default)", async () => {
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <BookRows
            books={[book]}
            onOpenBook={vi.fn()}
            onToggleFavorite={vi.fn()}
            onToggleRead={vi.fn()}
          />
        </AppProviders>
      );
    });

    expect(screen?.root.findByProps({ accessibilityLabel: "Marquer lu" })).toBeTruthy();
    expect(screen?.root.findByProps({ accessibilityLabel: "Retirer des favoris" })).toBeTruthy();
  });
});
