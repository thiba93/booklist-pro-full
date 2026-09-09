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
