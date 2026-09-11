import type { BookCreatePayload, BookUpdatePayload } from "../../services/api/booksApi";

/**
 * Types purs (aucune dependance reseau/storage) decrivant le contenu d'une
 * mutation hors ligne. Stockes tels quels dans la file persistee
 * (services/sync/mutationQueue.ts) et traduits vers le format API au
 * moment du rejeu (services/sync/replaySync.ts).
 */

export type MutationOuvrageCharge =
  | { nature: "creation"; payload: BookCreatePayload }
  | { nature: "modification"; livreId: string; payload: BookUpdatePayload; baseVersion: number }
  | { nature: "suppression"; livreId: string; baseVersion: number };

export type MutationNoteCharge =
  | { nature: "creation"; livreId: string; contenu: string }
  | { nature: "suppression"; livreId: string; noteId: string };

/**
 * - en_attente : sera envoyee au prochain rejeu.
 * - conflit : rejetee par le serveur (409) et abandonnee suite a la
 *   decision de deciderSortMutationConflit ; terminale, ne sera plus
 *   rejouee, mais conservee (pas supprimee) pour rester visible via
 *   l'indicateur permanent plutot que de disparaitre sans trace.
 * - erreur : rejetee de facon definitive et non liee a une version perimee
 *   (ex. validation serveur) ; egalement terminale.
 */
export type StatutMutation = "en_attente" | "conflit" | "erreur";

type ChampsCommuns = {
  id: string;
  /** Horodatage ISO-8601 de la mutation, utilise pour le LWW en cas de conflit (voir resolutionConflits.ts). */
  creeLe: string;
  statut: StatutMutation;
  /** Renseignes uniquement quand statut === "conflit" (etat du livre cote serveur au moment du refus). */
  serveur?: unknown;
  versionAttendue?: number | undefined;
};

export type MutationOuvrage = ChampsCommuns & {
  cible: "ouvrage";
  mutation: MutationOuvrageCharge;
};

export type MutationNote = ChampsCommuns & {
  cible: "note";
  mutation: MutationNoteCharge;
};

/**
 * Une mutation en attente de synchronisation, creee hors ligne (ou en ligne
 * mais jamais confirmee par le serveur) et rejouee au retour du reseau.
 * Voir docs/ADR/003-resolution-conflits.md pour le sort des mutations en
 * conflit.
 */
export type MutationHorsLigne = MutationOuvrage | MutationNote;
