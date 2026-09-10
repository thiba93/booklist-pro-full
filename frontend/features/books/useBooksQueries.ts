import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBook,
  createBookNote,
  deleteBook,
  deleteBookNote,
  getBook,
  getBookNotes,
  getBooks,
  patchBook,
  updateBook,
  type BookCreatePayload,
  type BookPatchPayload,
  type BookUpdatePayload,
  type BooksQuery
} from "../../services/api/booksApi";
import type { Book } from "../../domain/books/book";
import type { BooksPage, Note } from "../../services/api/schemas";
import { bookKeys } from "./bookQueryKeys";

type UpdateBookVariables = {
  id: string;
  payload: BookUpdatePayload;
  version: number;
};

type PatchBookVariables = {
  id: string;
  payload: BookPatchPayload;
};

export function useBooksList(query: BooksQuery) {
  return useQuery({
    queryKey: bookKeys.list(query),
    queryFn: ({ signal }) => getBooks(query, signal),
    placeholderData: (previousData) => previousData
  });
}

export function useBookDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: ({ signal }) => getBook(id, signal),
    enabled
  });
}

export function useBookNotes(id: string) {
  return useQuery({
    queryKey: bookKeys.notes(id),
    queryFn: ({ signal }) => getBookNotes(id, signal)
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BookCreatePayload) => createBook(payload),
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, version }: UpdateBookVariables) =>
      updateBook(id, payload, version),
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function usePatchBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: PatchBookVariables) => patchBook(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: bookKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: bookKeys.lists() });

      const previousDetail = queryClient.getQueryData<Book>(bookKeys.detail(id));
      const previousLists = queryClient.getQueriesData<BooksPage>({
        queryKey: bookKeys.lists()
      });

      const applyPatch = (book: Book): Book => ({ ...book, ...payload });

      if (previousDetail) {
        queryClient.setQueryData(bookKeys.detail(id), applyPatch(previousDetail));
      }

      previousLists.forEach(([key, page]) => {
        if (page) {
          queryClient.setQueryData(key, {
            ...page,
            items: page.items.map((book) => (book.id === id ? applyPatch(book) : book))
          });
        }
      });

      return { previousDetail, previousLists };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(bookKeys.detail(variables.id), context.previousDetail);
      }

      context?.previousLists.forEach(([key, page]) => {
        queryClient.setQueryData(key, page);
      });
    },
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useCreateBookNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contenu: string) => createBookNote(id, contenu),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookKeys.notes(id) });
    }
  });
}

export function useDeleteBookNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteBookNote(id, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: bookKeys.notes(id) });
      const previousNotes = queryClient.getQueryData<Note[]>(bookKeys.notes(id));
      queryClient.setQueryData<Note[]>(
        bookKeys.notes(id),
        (current) => current?.filter((note) => note.id !== noteId) ?? []
      );
      return { previousNotes };
    },
    onError: (_error, _noteId, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(bookKeys.notes(id), context.previousNotes);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: bookKeys.notes(id) });
    }
  });
}
