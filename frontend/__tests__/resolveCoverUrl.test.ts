import { describe, expect, it } from "vitest";

import { resolveCoverUrl } from "../services/covers/resolveCoverUrl";

describe("resolveCoverUrl", () => {
  it("uses an absolute URL as-is", () => {
    expect(resolveCoverUrl("https://example.com/cover.jpg", "book-1")).toBe(
      "https://example.com/cover.jpg"
    );
    expect(resolveCoverUrl("http://example.com/cover.jpg", "book-1")).toBe(
      "http://example.com/cover.jpg"
    );
  });

  it("prefixes a known relative cover path with the API base URL", () => {
    expect(resolveCoverUrl("/covers/book-1.svg", "book-1")).toBe(
      "http://localhost:3000/covers/book-1.svg"
    );
  });

  it("prefixes an uploaded media path with the API base URL", () => {
    expect(resolveCoverUrl("/media/book-1.png", "book-1")).toBe(
      "http://localhost:3000/media/book-1.png"
    );
  });

  it("falls back to the placeholder cover when null, prefixed by the API base URL", () => {
    expect(resolveCoverUrl(null, "book-42")).toBe("http://localhost:3000/covers/book-42.svg");
  });
});
