// @vitest-environment jsdom
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, clearApiAuthTokens, setApiAuthTokens } from "../services/api/httpClient";

const dataSchema = z.object({ ok: z.boolean() });

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("apiRequest refresh interceptor", () => {
  beforeEach(() => {
    clearApiAuthTokens();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("coalesces N concurrent 401s into a single /auth/refresh call and replays every request", async () => {
    setApiAuthTokens({ accessToken: "expired", refreshToken: "refresh-1" });

    let refreshCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(jsonResponse(200, { accessToken: "fresh-token", expiresIn: 120 }));
      }

      const headers = new Headers(init?.headers);
      if (headers.get("Authorization") === "Bearer expired") {
        return Promise.resolve(
          jsonResponse(401, { erreur: "jeton_expire", message: "Jeton expire." })
        );
      }

      return Promise.resolve(jsonResponse(200, { ok: true }));
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => apiRequest("/data", dataSchema))
    );

    expect(results).toHaveLength(10);
    results.forEach((result) => expect(result).toEqual({ ok: true }));
    expect(refreshCalls).toBe(1);
  });

  it("surfaces a 403 without attempting a refresh", async () => {
    setApiAuthTokens({ accessToken: "valid", refreshToken: "refresh-1" });

    let refreshCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(jsonResponse(200, { accessToken: "fresh-token", expiresIn: 120 }));
      }

      return Promise.resolve(
        jsonResponse(403, { erreur: "droits_insuffisants", message: "Role lecteur : action non autorisee." })
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/books", dataSchema, { method: "POST" })).rejects.toMatchObject({
      type: "ErreurAuth",
      status: 403
    });
    expect(refreshCalls).toBe(0);
  });
});
