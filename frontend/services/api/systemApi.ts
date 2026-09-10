import type { Book } from "../../domain/books/book";
import { apiRequest } from "./httpClient";
import {
  healthSchema,
  statsSchema,
  syncResponseSchema,
  type Health,
  type Stats,
  type SyncResponse
} from "./schemas";

type SyncCreateMutation = {
  id: string;
  type: "create";
  livre: Pick<Book, "titre" | "auteur" | "annee"> &
    Partial<Pick<Book, "editeur" | "lu" | "favori" | "note" | "couverture">>;
};

type SyncUpdateMutation = {
  id: string;
  type: "update";
  baseVersion?: number;
  livre: Pick<Book, "id"> &
    Partial<
      Pick<Book, "titre" | "auteur" | "editeur" | "annee" | "lu" | "favori" | "note" | "couverture">
    >;
};

type SyncDeleteMutation = {
  id: string;
  type: "delete";
  livreId: string;
  baseVersion?: number;
};

export type SyncMutation = SyncCreateMutation | SyncUpdateMutation | SyncDeleteMutation;

export function getHealth(): Promise<Health> {
  return apiRequest("/health", healthSchema);
}

export function getStats(): Promise<Stats> {
  return apiRequest("/stats", statsSchema);
}

export function syncBooks(mutations: readonly SyncMutation[]): Promise<SyncResponse> {
  return apiRequest("/sync", syncResponseSchema, {
    body: { mutations },
    method: "POST"
  });
}
