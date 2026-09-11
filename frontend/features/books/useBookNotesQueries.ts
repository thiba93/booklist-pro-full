import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBookNote, deleteBookNote, getBookNotes } from "../../services/api/booksApi";
import type { Note } from "../../services/api/schemas";
import { estEnLigne } from "../../services/reseau";
import { bookKeys } from "./bookQueryKeys";
import { creerNoteHorsLigne, estIdProvisoire, supprimerNoteHorsLigne } from "./offlineBookMutations";

export function useBookNotes(id: string) {
  return useQuery({
    queryKey: bookKeys.notes(id),
    queryFn: ({ signal }) => getBookNotes(id, signal)
  });
}

export function useCreateBookNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contenu: string) => {
      if (estEnLigne()) {
        return createBookNote(id, contenu);
      }

      return creerNoteHorsLigne(id, contenu);
    },
    onSuccess: async (note) => {
      if (estIdProvisoire(note.id)) {
        queryClient.setQueryData<Note[]>(bookKeys.notes(id), (current) => [note, ...(current ?? [])]);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: bookKeys.notes(id) });
    }
  });
}

export function useDeleteBookNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (estEnLigne()) {
        await deleteBookNote(id, noteId);
        return;
      }

      supprimerNoteHorsLigne(id, noteId);
    },
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
