import { z } from "zod";

import type { Book } from "../../domain/books/book";
import type { ApiError, ErreurConflit } from "../../services/api/apiErrors";
import type { BookUpdatePayload } from "../../services/api/booksApi";

const fieldNames = ["titre", "auteur", "editeur", "annee", "note", "lu", "favori"] as const;

export type BookFormField = (typeof fieldNames)[number];

export const bookFormSchema = z.object({
  titre: z.string().trim().min(1, "Titre obligatoire").max(200, "200 caracteres maximum"),
  auteur: z.string().trim().min(1, "Auteur obligatoire").max(200, "200 caracteres maximum"),
  editeur: z.string().trim().max(200, "200 caracteres maximum"),
  annee: z
    .string()
    .trim()
    .min(1, "Annee obligatoire")
    .refine((value) => {
      const year = Number(value);
      const maxYear = new Date().getFullYear() + 1;
      return Number.isInteger(year) && year >= 1450 && year <= maxYear;
    }, "Annee invalide"),
  note: z
    .string()
    .trim()
    .refine((value) => {
      if (value.length === 0) {
        return true;
      }

      const note = Number(value);
      return Number.isFinite(note) && note >= 0 && note <= 5;
    }, "Note entre 0 et 5"),
  lu: z.boolean(),
  favori: z.boolean()
});

export type BookFormValues = z.infer<typeof bookFormSchema>;
export type BookFieldErrors = Partial<Record<BookFormField, string>>;

export const emptyBookFormValues: BookFormValues = {
  titre: "",
  auteur: "",
  editeur: "",
  annee: String(new Date().getFullYear()),
  note: "",
  lu: false,
  favori: false
};

export function bookToFormValues(book: Book): BookFormValues {
  return {
    titre: book.titre,
    auteur: book.auteur,
    editeur: book.editeur,
    annee: String(book.annee),
    note: book.note === null ? "" : String(book.note),
    lu: book.lu,
    favori: book.favori
  };
}

export function formValuesToBookPayload(values: BookFormValues): BookUpdatePayload {
  const payload: BookUpdatePayload = {
    titre: values.titre.trim(),
    auteur: values.auteur.trim(),
    editeur: values.editeur.trim(),
    annee: Number(values.annee),
    lu: values.lu,
    favori: values.favori
  };

  if (values.note.trim().length > 0) {
    payload.note = Number(values.note);
  }

  return payload;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "type" in error;
}

function isBookFormField(field: string): field is BookFormField {
  return fieldNames.some((name) => name === field);
}

export function validationErrorsFromApi(error: unknown): BookFieldErrors {
  if (!isApiError(error) || error.type !== "ErreurValidation") {
    return {};
  }

  const fieldErrors: BookFieldErrors = {};

  Object.entries(error.champs).forEach(([field, message]) => {
    if (isBookFormField(field)) {
      fieldErrors[field] = message;
    }
  });

  return fieldErrors;
}

/**
 * Un vrai 409 HTTP (PUT /books/:id avec If-Match perime) : quelqu'un a
 * modifie l'ouvrage entre le chargement du formulaire et la soumission.
 * Distinct des conflits de la file hors ligne (POST /sync, voir
 * docs/ADR/003-resolution-conflits.md) : ici l'utilisateur est present et
 * en ligne, donc pas de decision automatique (LWW) - BookFormScreen lui
 * propose directement le choix garder serveur / reappliquer.
 */
export function conflictFromApi(error: unknown): ErreurConflit | null {
  return isApiError(error) && error.type === "ErreurConflit" ? error : null;
}
