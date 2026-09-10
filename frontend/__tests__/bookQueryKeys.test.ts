import { describe, expect, it } from "vitest";

import {
  bookKeys,
  booksPageSize,
  normalizeBooksQuery
} from "../features/books/bookQueryKeys";

describe("book query keys", () => {
  it("normalizes list queries without requesting the whole catalog", () => {
    const query = normalizeBooksQuery({ page: 2, q: "  dune  " });

    expect(query).toEqual({
      page: 2,
      limit: booksPageSize,
      q: "dune",
      status: null,
      favori: null,
      sort: "titre",
      order: "asc"
    });
    expect(query.limit).toBe(20);
  });

  it("builds structured cache keys", () => {
    expect(bookKeys.list({ page: 1, limit: 20 })).toEqual([
      "books",
      "list",
      {
        page: 1,
        limit: 20,
        q: "",
        status: null,
        favori: null,
        sort: "titre",
        order: "asc"
      }
    ]);
    expect(bookKeys.detail("livre-1")).toEqual(["books", "detail", { id: "livre-1" }]);
  });
});
