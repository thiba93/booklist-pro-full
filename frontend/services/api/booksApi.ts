import type { Book } from "../../domain/books/book";
import { apiRequest } from "./httpClient";
import {
  bookSchema,
  booksPageSchema,
  emptyResponseSchema,
  noteSchema,
  type BooksPage,
  type Note
} from "./schemas";

export type BooksQuery = {
  page?: number;
  limit?: number;
  q?: string;
  status?: "lu" | "nonlu";
  favori?: boolean;
  auteur?: string;
  sort?: "titre" | "auteur" | "annee" | "note" | "updatedAt";
  order?: "asc" | "desc";
};

export type BookCreatePayload = Pick<Book, "titre" | "auteur" | "annee"> &
  Partial<Pick<Book, "editeur" | "lu" | "favori" | "note" | "couverture">>;

export type BookUpdatePayload = Pick<Book, "titre" | "auteur" | "annee"> &
  Partial<Pick<Book, "editeur" | "lu" | "favori" | "note" | "couverture">>;

export type BookPatchPayload = Partial<
  Pick<Book, "titre" | "auteur" | "editeur" | "annee" | "lu" | "favori" | "note" | "couverture">
>;

export type BookCoverPayload = {
  base64: string;
};

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function booksPath(query: BooksQuery = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? (`/books?${queryString}` as const) : "/books";
}

export function getBooks(query?: BooksQuery, signal?: AbortSignal): Promise<BooksPage> {
  return apiRequest(booksPath(query), booksPageSchema, { signal });
}

export function getBook(id: string, signal?: AbortSignal): Promise<Book> {
  return apiRequest(`/books/${encodePathSegment(id)}`, bookSchema, { signal });
}

export function createBook(payload: BookCreatePayload): Promise<Book> {
  return apiRequest("/books", bookSchema, {
    body: payload,
    method: "POST"
  });
}

export function updateBook(id: string, payload: BookUpdatePayload, version: number): Promise<Book> {
  return apiRequest(`/books/${encodePathSegment(id)}`, bookSchema, {
    body: payload,
    headers: { "If-Match": String(version) },
    method: "PUT"
  });
}

export function patchBook(id: string, payload: BookPatchPayload): Promise<Book> {
  return apiRequest(`/books/${encodePathSegment(id)}`, bookSchema, {
    body: payload,
    method: "PATCH"
  });
}

export function deleteBook(id: string): Promise<void> {
  return apiRequest(`/books/${encodePathSegment(id)}`, emptyResponseSchema, {
    method: "DELETE",
    responseKind: "empty"
  });
}

export function getBookNotes(id: string, signal?: AbortSignal): Promise<Note[]> {
  return apiRequest(`/books/${encodePathSegment(id)}/notes`, noteSchema.array(), { signal });
}

export function createBookNote(id: string, contenu: string): Promise<Note> {
  return apiRequest(`/books/${encodePathSegment(id)}/notes`, noteSchema, {
    body: { contenu },
    method: "POST"
  });
}

export function deleteBookNote(bookId: string, noteId: string): Promise<void> {
  return apiRequest(
    `/books/${encodePathSegment(bookId)}/notes/${encodePathSegment(noteId)}`,
    emptyResponseSchema,
    {
      method: "DELETE",
      responseKind: "empty"
    }
  );
}

export function uploadBookCover(id: string, payload: BookCoverPayload): Promise<Book> {
  return apiRequest(`/books/${encodePathSegment(id)}/cover`, bookSchema, {
    body: payload,
    method: "POST"
  });
}

export function deleteBookCover(id: string): Promise<Book> {
  return apiRequest(`/books/${encodePathSegment(id)}/cover`, bookSchema, {
    method: "DELETE"
  });
}
