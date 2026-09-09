import type { Book } from "../../domain/books/book";
import { apiRequest } from "./httpClient";

export type BooksPage = {
  data: Book[];
  page: number;
  pageSize: number;
  total: number;
};

export function getBooks() {
  return apiRequest<BooksPage>("/books");
}
