import type { BooksQuery } from "../../services/api/booksApi";

export const booksPageSize = 20;

export type NormalizedBooksQuery = {
  page: number;
  limit: number;
  q: string;
  status: BooksQuery["status"] | null;
  favori: boolean | null;
  sort: NonNullable<BooksQuery["sort"]>;
  order: NonNullable<BooksQuery["order"]>;
};

export function normalizeBooksQuery(query: BooksQuery = {}): NormalizedBooksQuery {
  return {
    page: query.page ?? 1,
    limit: query.limit ?? booksPageSize,
    q: query.q?.trim() ?? "",
    status: query.status ?? null,
    favori: query.favori ?? null,
    sort: query.sort ?? "titre",
    order: query.order ?? "asc"
  };
}

export const bookKeys = {
  root: ["books"] as const,
  lists: () => [...bookKeys.root, "list"] as const,
  list: (query: BooksQuery) => [...bookKeys.lists(), normalizeBooksQuery(query)] as const,
  details: () => [...bookKeys.root, "detail"] as const,
  detail: (id: string) => [...bookKeys.details(), { id }] as const,
  notes: (id: string) => [...bookKeys.detail(id), "notes"] as const
};
