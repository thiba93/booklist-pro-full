import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBook,
  deleteBook,
  deleteBookCover,
  getBook,
  getBooks,
  patchBook,
  updateBook,
  uploadBookCover,
  type BookCreatePayload,
  type BookPatchPayload,
  type BookUpdatePayload,
  type BooksQuery
} from "../../services/api/booksApi";
import type { Book } from "../../domain/books/book";
import { estEnLigne } from "../../services/reseau";
import type { BooksPage } from "../../services/api/schemas";
import { bookKeys } from "./bookQueryKeys";
import {
  creerOuvrageHorsLigne,
  estIdProvisoire,
  insererOuvrageDansListes,
  modifierOuvrageHorsLigne,
  patcherOuvrageHorsLigne,
  remplacerOuvrageDansListes,
  retirerOuvrageDesListes,
  supprimerOuvrageHorsLigne
} from "./offlineBookMutations";

/**
 * Hooks CRUD sur les ouvrages. Chaque mutation suit le meme schema :
 * `if (estEnLigne()) { <appel API reel> } else { <equivalent hors ligne> }`
 * dans mutationFn (voir features/books/offlineBookMutations.ts pour la
 * partie hors ligne), pour que React Query n'ait jamais a savoir si l'appel
 * a vraiment touche le reseau. Cote React Query, `networkMode: "always"`
 * est indispensable sur les mutations (voir app/AppShell.tsx) : sans lui,
 * React Query intercepte l'appel AVANT meme d'atteindre ce mutationFn des
 * qu'il detecte le navigateur hors ligne, empechant purement et simplement
 * la branche offline ci-dessous de s'executer.
 */

/**
 * Une edition/suppression hors ligne d'un ouvrage jamais encore consulte
 * n'a pas de version de reference en cache pour construire le resultat
 * local ni enfiler une mutation coherente. Cas limite improbable en usage
 * normal (le formulaire d'edition charge toujours la fiche au prealable)
 * mais mieux vaut un message clair qu'un plantage silencieux.
 */
function erreurHorsLigneSansCache(): Error {
  return new Error("Ouvrage indisponible hors ligne : ouvrez-le au moins une fois en ligne d'abord.");
}

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

export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BookCreatePayload) => {
      if (estEnLigne()) {
        return createBook(payload);
      }

      return creerOuvrageHorsLigne(payload);
    },
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);

      if (estIdProvisoire(book.id)) {
        insererOuvrageDansListes(queryClient, book);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload, version }: UpdateBookVariables) => {
      if (estEnLigne()) {
        return updateBook(id, payload, version);
      }

      const actuel = queryClient.getQueryData<Book>(bookKeys.detail(id));
      if (!actuel) {
        throw erreurHorsLigneSansCache();
      }

      return modifierOuvrageHorsLigne(actuel, payload);
    },
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);

      if (estIdProvisoire(book.id)) {
        remplacerOuvrageDansListes(queryClient, book);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function usePatchBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: PatchBookVariables) => {
      if (estEnLigne()) {
        return patchBook(id, payload);
      }

      const actuel = queryClient.getQueryData<Book>(bookKeys.detail(id));
      if (!actuel) {
        throw erreurHorsLigneSansCache();
      }

      return patcherOuvrageHorsLigne(actuel, payload);
    },
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

// { horsLigne, id } indique a onSuccess la branche prise, sans re-tester estEnLigne().
export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (estEnLigne()) {
        await deleteBook(id);
        return { horsLigne: false, id };
      }

      const actuel = queryClient.getQueryData<Book>(bookKeys.detail(id));
      if (!actuel) {
        throw erreurHorsLigneSansCache();
      }

      supprimerOuvrageHorsLigne(actuel);
      return { horsLigne: true, id };
    },
    onSuccess: async ({ horsLigne, id }) => {
      queryClient.removeQueries({ queryKey: bookKeys.detail(id) });

      if (horsLigne) {
        retirerOuvrageDesListes(queryClient, id);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useUploadBookCover(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (base64: string) => uploadBookCover(id, { base64 }),
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}

export function useDeleteBookCover(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteBookCover(id),
    onSuccess: async (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    }
  });
}
