import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { Book } from "../domain/books/book";
import { BookRows } from "../features/books/BookListParts";

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

describe("BookRows", () => {
  it("renders accessible read and favorite actions", async () => {
    const onOpenBook = vi.fn();
    const onToggleFavorite = vi.fn();
    const onToggleRead = vi.fn();
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <BookRows
          books={[book]}
          isMutating={false}
          onOpenBook={onOpenBook}
          onToggleFavorite={onToggleFavorite}
          onToggleRead={onToggleRead}
        />
      );
    });

    if (!screen) {
      throw new Error("Rendu indisponible");
    }

    const root = screen.root;
    root.findByProps({ accessibilityLabel: "Ouvrir Dune" }).props.onPress();
    root.findByProps({ accessibilityLabel: "Marquer lu" }).props.onPress();
    root.findByProps({ accessibilityLabel: "Retirer des favoris" }).props.onPress();

    expect(root.findByProps({ children: "♥" })).toBeTruthy();
    expect(onOpenBook).toHaveBeenCalledWith("book-1");
    expect(onToggleRead).toHaveBeenCalledWith(book);
    expect(onToggleFavorite).toHaveBeenCalledWith(book);
  });
});
