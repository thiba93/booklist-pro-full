import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBookNote, deleteBookNote, getBookNotes } from "../../services/api/booksApi";
import type { Note } from "../../services/api/schemas";
import { estEnLigne } from "../../services/reseau";
import { bookKeys } from "./bookQueryKeys";
import { creerNoteHorsLigne, estIdProvisoire, supprimerNoteHorsLigne } from "./offlineBookMutations";

/**
 * Hooks React Query pour les notes de lecture d'un ouvrage, extraits de
 * useBooksQueries.ts pour rester sous la limite de 250 lignes imposee par
 * lint:architecture. Meme pattern "online direct / offline mis en file"
 * que les hooks livres : voir features/books/offlineBookMutations.ts et
 * services/sync/mutationQueue.ts pour le detail de la strategie hors ligne.
 */

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
      // En ligne : creation reelle immediate. Hors ligne : note provisoire
      // (id local prefixe, voir estIdProvisoire) + mutation enfilee pour
      // rejeu ulterieur (services/sync/replaySync.ts). Dans les deux cas la
      // fonction resout avec une Note affichable tout de suite.
      if (estEnLigne()) {
        return createBookNote(id, contenu);
      }

      return creerNoteHorsLigne(id, contenu);
    },
    onSuccess: async (note) => {
      if (estIdProvisoire(note.id)) {
        // Pas d'invalidation ici : elle declencherait un refetch reseau
        // qui echouerait hors ligne. On insere directement la note
        // provisoire en tete de cache pour qu'elle s'affiche a l'instant.
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

      // supprimerNoteHorsLigne gere elle-meme le cas d'une note jamais
      // synchronisee (annule sa creation en attente au lieu d'enfiler une
      // suppression qui ne correspondrait a rien cote serveur).
      supprimerNoteHorsLigne(id, noteId);
    },
    // Optimiste dans les deux cas (online et offline) : la note disparait
    // du cache des le clic, avant meme la resolution de mutationFn. Le seul
    // risque de rollback (onError) vient d'un echec REEL en ligne ; hors
    // ligne, mutationFn ne rejette jamais (voir supprimerNoteHorsLigne), la
    // suppression optimiste est donc definitive tant qu'on ne s'est pas
    // reconnecte.
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
      // Hors ligne, cette invalidation declenche un refetch qui echoue
      // silencieusement (voir AppShell : networkMode par defaut sur les
      // queries) et laisse la liste optimiste telle quelle - comportement
      // voulu, pas une erreur a traiter.
      await queryClient.invalidateQueries({ queryKey: bookKeys.notes(id) });
    }
  });
}
