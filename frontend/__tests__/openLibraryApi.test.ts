import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOpenLibraryEnrichment } from "../services/api/openLibraryApi";

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(body)
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOpenLibraryEnrichment", () => {
  it("returns parsed data on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ docs: [{ first_publish_year: 1965, subject: ["Science fiction", "Adventure"] }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOpenLibraryEnrichment("Dune Unique Query", "Frank Herbert");

    expect(result).toEqual({ premierePublication: 1965, sujets: ["Science fiction", "Adventure"] });
  });

  it("never throws and resolves to null on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    await expect(fetchOpenLibraryEnrichment("Titre Reseau KO", "Auteur")).resolves.toBeNull();
  });

  it("resolves to null on a non-ok HTTP response instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));

    await expect(fetchOpenLibraryEnrichment("Titre HTTP KO", "Auteur")).resolves.toBeNull();
  });

  it("resolves to null when the response does not match the expected shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ inattendu: true })));

    await expect(fetchOpenLibraryEnrichment("Titre Forme KO", "Auteur")).resolves.toBeNull();
  });

  it("aborts the request when it exceeds the timeout instead of hanging", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchOpenLibraryEnrichment("Titre Timeout", "Auteur");
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toBeNull();
    vi.useRealTimers();
  });

  it("caches a result and does not call fetch again for the same book", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ docs: [{ first_publish_year: 1999 }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchOpenLibraryEnrichment("Titre Cache Unique", "Auteur Cache");
    await fetchOpenLibraryEnrichment("Titre Cache Unique", "Auteur Cache");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
