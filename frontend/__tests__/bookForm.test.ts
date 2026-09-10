import { describe, expect, it } from "vitest";

import {
  bookFormSchema,
  formValuesToBookPayload,
  validationErrorsFromApi
} from "../features/books/bookForm";
import { mapApiError } from "../services/api/apiErrors";

describe("book form", () => {
  it("validates required fields", () => {
    const result = bookFormSchema.safeParse({
      titre: "",
      auteur: "",
      editeur: "",
      annee: "1200",
      note: "8",
      lu: false,
      favori: false
    });

    expect(result.success).toBe(false);
  });

  it("builds an API payload without loading unrelated data", () => {
    const payload = formValuesToBookPayload({
      titre: "  Dune  ",
      auteur: "Frank Herbert",
      editeur: "Ace",
      annee: "1965",
      note: "5",
      lu: true,
      favori: true
    });

    expect(payload).toEqual({
      titre: "Dune",
      auteur: "Frank Herbert",
      editeur: "Ace",
      annee: 1965,
      note: 5,
      lu: true,
      favori: true
    });
  });

  it("maps API validation errors to form fields", () => {
    const error = mapApiError(422, {
      erreur: "validation",
      champs: {
        titre: "champ obligatoire",
        annee: "annee invalide",
        inconnu: "ignore"
      }
    });

    expect(validationErrorsFromApi(error)).toEqual({
      titre: "champ obligatoire",
      annee: "annee invalide"
    });
  });
});
