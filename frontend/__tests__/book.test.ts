import { describe, expect, it } from "vitest";

import { getBookLabel } from "../domain/books/book";

describe("getBookLabel", () => {
  it("formats a book with title and author", () => {
    const label = getBookLabel({
      auteur: "Mary Shelley",
      titre: "Frankenstein"
    });

    expect(label).toBe("Frankenstein - Mary Shelley");
  });
});
