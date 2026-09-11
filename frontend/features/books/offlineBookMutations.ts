import type { QueryClient } from "@tanstack/react-query";

import type { Book } from "../../domain/books/book";
import type { BookCreatePayload, BookPatchPayload, BookUpdatePayload } from "../../services/api/booksApi";
import type { BooksPage, Note } from "../../services/api/schemas";
import {
  enfilerCreationNote,
  enfilerCreationOuvrage,
  enfilerModificationOuvrage,
  enfilerSuppressionNote,
  enfilerSuppressionOuvrage,
  genererIdMutation,
  retirerMutation
} from "../../services/sync/mutationQueue";
import { bookKeys } from "./bookQueryKeys";

/**
 * Cote "hors ligne" des hooks useBooksQueries/useBookNotesQueries : construit
 * les entites provisoires affichees immediatement dans l'UI, enfile les
 * mutations correspondantes (services/sync/mutationQueue.ts), et met a jour
 * directement le cache React Query des listes (sans passer par invalidate,
 * qui declencherait un refetch reseau voue a echouer hors ligne).
 */

const PREFIXE_ID_PROVISOIRE = "horsligne-";

/** Un id genere localement (creation faite hors ligne, pas encore synchronisee). */
export function estIdProvisoire(id: string): boolean {
  return id.startsWith(PREFIXE_ID_PROVISOIRE);
}

function maintenant(): string {
  return new Date().toISOString();
}

/**
 * Construit un ouvrage provisoire pour l'afficher immediatement dans
 * l'interface, et enfile la mutation de creation correspondante.
 */
export function creerOuvrageHorsLigne(payload: BookCreatePayload): Book {
  const id = `${PREFIXE_ID_PROVISOIRE}${genererIdMutation()}`;
  const date = maintenant();

  enfilerCreationOuvrage(id, payload);

  return {
    id,
    titre: payload.titre,
    auteur: payload.auteur,
    editeur: payload.editeur ?? "",
    annee: payload.annee,
    lu: payload.lu ?? false,
    favori: payload.favori ?? false,
    note: payload.note ?? null,
    couverture: payload.couverture ?? null,
    createdAt: date,
    updatedAt: date,
    version: 0
  };
}

/**
 * Edition complete (formulaire) hors ligne : `actuel.version` sert de
 * baseVersion pour la mutation - elle reste la vraie derniere version
 * connue du serveur tant qu'aucune vraie synchronisation n'a eu lieu (le
 * patch local ne la fait jamais avancer), ce qui garde la comparaison de
 * conflit valide meme apres plusieurs editions hors ligne successives (la
 * fusion de mutationQueue.enfilerModificationOuvrage s'occupe du reste).
 */
export function modifierOuvrageHorsLigne(actuel: Book, payload: BookUpdatePayload): Book {
  enfilerModificationOuvrage(genererIdMutation(), actuel.id, payload, actuel.version);
  return { ...actuel, ...payload, updatedAt: maintenant() };
}

/**
 * Edition partielle (toggle lu/favori depuis la liste ou la fiche) hors
 * ligne. Le payload envoye au serveur est le livre complet fusionne
 * (`complet`), pas seulement le champ modifie : /sync attend un objet
 * livre exploitable tel quel pour une mutation "update", pas un diff.
 */
export function patcherOuvrageHorsLigne(actuel: Book, payload: BookPatchPayload): Book {
  const complet = { ...actuel, ...payload };
  enfilerModificationOuvrage(genererIdMutation(), actuel.id, complet, actuel.version);
  return { ...complet, updatedAt: maintenant() };
}

export function supprimerOuvrageHorsLigne(actuel: Book): void {
  enfilerSuppressionOuvrage(genererIdMutation(), actuel.id, actuel.version);
}

/** Note provisoire : meme principe que creerOuvrageHorsLigne mais pour une note. */
export function creerNoteHorsLigne(livreId: string, contenu: string): Note {
  const id = `${PREFIXE_ID_PROVISOIRE}${genererIdMutation()}`;
  enfilerCreationNote(id, livreId, contenu);
  return { id, livreId, contenu, createdAt: maintenant() };
}

/**
 * Si la note supprimee n'a jamais quitte l'appareil (id provisoire), la
 * mutation de creation correspondante est simplement annulee : inutile
 * d'envoyer une creation puis une suppression au serveur, et cela evite un
 * id de suppression qui ne correspondrait plus a rien une fois la creation
 * rejouee sous un id serveur different.
 */
export function supprimerNoteHorsLigne(livreId: string, noteId: string): void {
  if (estIdProvisoire(noteId)) {
    retirerMutation(noteId);
    return;
  }

  enfilerSuppressionNote(genererIdMutation(), livreId, noteId);
}

/**
 * Ajoute un ouvrage cree hors ligne en tete de CHAQUE page de liste
 * actuellement en cache (toutes les combinaisons filtre/tri deja
 * chargees), pas seulement la premiere. Le total affiche est incremente en
 * consequence ; approximatif tant que la synchronisation n'a pas eu lieu
 * (le vrai total serveur peut differer selon les filtres actifs), corrige
 * au prochain refetch reussi.
 */
export function insererOuvrageDansListes(queryClient: QueryClient, livre: Book): void {
  queryClient.setQueriesData<BooksPage>({ queryKey: bookKeys.lists() }, (page) => {
    if (!page) {
      return page;
    }

    return { ...page, items: [livre, ...page.items], total: page.total + 1 };
  });
}

/** Remplace en place l'entree d'un ouvrage deja present dans les listes en cache (edition hors ligne). */
export function remplacerOuvrageDansListes(queryClient: QueryClient, livre: Book): void {
  queryClient.setQueriesData<BooksPage>({ queryKey: bookKeys.lists() }, (page) => {
    if (!page) {
      return page;
    }

    return {
      ...page,
      items: page.items.map((item) => (item.id === livre.id ? livre : item))
    };
  });
}

/** Retire un ouvrage supprime hors ligne de chaque page de liste en cache. */
export function retirerOuvrageDesListes(queryClient: QueryClient, id: string): void {
  queryClient.setQueriesData<BooksPage>({ queryKey: bookKeys.lists() }, (page) => {
    if (!page) {
      return page;
    }

    return {
      ...page,
      items: page.items.filter((livre) => livre.id !== id),
      total: Math.max(0, page.total - 1)
    };
  });
}
