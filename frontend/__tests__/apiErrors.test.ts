import { describe, expect, it } from "vitest";

import { mapApiError, mapNetworkError } from "../services/api/apiErrors";

describe("api error mapping", () => {
  it("maps validation errors with field details", () => {
    const error = mapApiError(422, {
      erreur: "validation",
      champs: { titre: "champ obligatoire" }
    });

    expect(error.type).toBe("ErreurValidation");
    if (error.type !== "ErreurValidation") {
      throw new Error("ErreurValidation attendue");
    }
    expect(error.status).toBe(422);
    expect(error.code).toBe("validation");
    expect(error.champs).toEqual({ titre: "champ obligatoire" });
  });

  it("maps version conflicts", () => {
    const serveur = { id: "book-1", version: 7 };
    const error = mapApiError(409, {
      erreur: "conflit",
      message: "Ce livre a ete modifie entre temps.",
      serveur,
      versionAttendue: 7
    });

    expect(error.type).toBe("ErreurConflit");
    if (error.type !== "ErreurConflit") {
      throw new Error("ErreurConflit attendue");
    }
    expect(error.status).toBe(409);
    expect(error.serveur).toBe(serveur);
    expect(error.versionAttendue).toBe(7);
  });

  it("maps auth failures", () => {
    const error = mapApiError(401, {
      erreur: "jeton_expire",
      message: "Jeton expire."
    });

    expect(error.type).toBe("ErreurAuth");
    expect(error.status).toBe(401);
    expect(error.code).toBe("jeton_expire");
  });

  it("maps temporary server unavailability", () => {
    const error = mapApiError(503, {
      erreur: "service_indisponible",
      message: "Reessayez."
    });

    expect(error.type).toBe("ErreurServeurIndisponible");
    if (error.type !== "ErreurServeurIndisponible") {
      throw new Error("ErreurServeurIndisponible attendue");
    }
    expect(error.status).toBe(503);
    expect(error.retryable).toBe(true);
  });

  it("maps network and timeout failures", () => {
    const networkError = mapNetworkError(new TypeError("fetch failed"));
    const timeoutError = mapNetworkError(new DOMException("aborted", "AbortError"));

    expect(networkError.type).toBe("ErreurReseau");
    expect(networkError.timeout).toBe(false);
    expect(timeoutError.type).toBe("ErreurReseau");
    expect(timeoutError.timeout).toBe(true);
  });
});
