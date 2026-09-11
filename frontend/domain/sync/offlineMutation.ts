import type { BookCreatePayload, BookUpdatePayload } from "../../services/api/booksApi";

export type MutationOuvrageCharge =
  | { nature: "creation"; payload: BookCreatePayload }
  | { nature: "modification"; livreId: string; payload: BookUpdatePayload; baseVersion: number }
  | { nature: "suppression"; livreId: string; baseVersion: number };

export type MutationNoteCharge =
  | { nature: "creation"; livreId: string; contenu: string }
  | { nature: "suppression"; livreId: string; noteId: string };

export type StatutMutation = "en_attente" | "conflit" | "erreur";

type ChampsCommuns = {
  id: string;
  creeLe: string;
  statut: StatutMutation;
  serveur?: unknown;
  versionAttendue?: number;
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
