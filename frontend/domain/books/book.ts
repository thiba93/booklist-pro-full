export type Book = {
  id: string;
  titre: string;
  auteur: string;
  editeur: string;
  annee: number;
  lu: boolean;
  favori: boolean;
  note: number | null;
  couverture: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export function getBookLabel(book: Pick<Book, "titre" | "auteur">) {
  return `${book.titre} - ${book.auteur}`;
}

/**
 * Lit le titre d'un ouvrage recu comme `unknown` (ex. le champ `serveur`
 * d'un conflit 409/POST-sync, dont le type declare est volontairement
 * large - voir services/api/apiErrors.ts et domain/sync/offlineMutation.ts).
 * Utilise partout ou l'on affiche "X a ete modifie ailleurs" sans etre sur
 * de la forme exacte de la reponse serveur.
 */
export function titreDepuisInconnu(valeur: unknown): string | null {
  if (
    typeof valeur === "object" &&
    valeur !== null &&
    "titre" in valeur &&
    typeof (valeur as { titre: unknown }).titre === "string"
  ) {
    return (valeur as { titre: string }).titre;
  }

  return null;
}
