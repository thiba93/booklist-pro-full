import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";

import type { Book } from "../../domain/books/book";
import type { BooksQuery } from "../../services/api/booksApi";
import { styles } from "./BookListScreen.styles";

export type StatusFilter = "tous" | "lu" | "nonlu";
export type SortField = Exclude<NonNullable<BooksQuery["sort"]>, "updatedAt">;

export function FilterSegments(props: {
  status: StatusFilter;
  onChange: (status: StatusFilter) => void;
}) {
  return (
    <View style={styles.segment}>
      {(["tous", "lu", "nonlu"] as const).map((item) => (
        <Pressable
          accessibilityLabel={`Filtrer ${item}`}
          accessibilityRole="button"
          accessibilityState={{ selected: props.status === item }}
          key={item}
          onPress={() => props.onChange(item)}
          style={[styles.segmentButton, props.status === item && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentButtonText, props.status === item && styles.segmentButtonTextActive]}>
            {item === "tous" ? "Tous" : item === "lu" ? "Lus" : "Non lus"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SortSegments(props: {
  sort: SortField;
  onChange: (sort: SortField) => void;
}) {
  return (
    <View style={styles.segment}>
      {(["titre", "auteur", "annee", "note"] as const).map((item) => (
        <Pressable
          accessibilityLabel={`Trier par ${item}`}
          accessibilityRole="button"
          accessibilityState={{ selected: props.sort === item }}
          key={item}
          onPress={() => props.onChange(item)}
          style={[styles.segmentButton, props.sort === item && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentButtonText, props.sort === item && styles.segmentButtonTextActive]}>
            {sortLabel(item)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function BookRows(props: {
  books: Book[];
  isMutating: boolean;
  onOpenBook: (id: string) => void;
  onToggleFavorite: (book: Book) => void;
  onToggleRead: (book: Book) => void;
}) {
  return (
    <View style={styles.list}>
      {props.books.map((book) => (
        <View key={book.id} style={styles.row}>
          <Pressable
            accessibilityLabel={`Ouvrir ${book.titre}`}
            accessibilityRole="button"
            onPress={() => props.onOpenBook(book.id)}
            style={styles.rowMain}
          >
            <Text style={styles.rowTitle}>{book.titre}</Text>
            <Text style={styles.rowMeta}>{book.auteur} - {book.annee}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={book.lu ? "Marquer non lu" : "Marquer lu"}
            accessibilityRole="button"
            accessibilityState={{ checked: book.lu, busy: props.isMutating }}
            onPress={() => props.onToggleRead(book)}
            style={[styles.statusButton, book.lu && styles.statusButtonDone]}
          >
            <Text style={[styles.statusText, book.lu && styles.statusTextDone]}>
              {book.lu ? "Lu" : "Non lu"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={book.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
            accessibilityRole="button"
            accessibilityState={{ checked: book.favori, busy: props.isMutating }}
            onPress={() => props.onToggleFavorite(book)}
            style={[styles.heartButton, book.favori && styles.heartButtonActive]}
          >
            <Text style={[styles.heartText, book.favori && styles.heartTextActive]}>
              {book.favori ? "♥" : "♡"}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function Pagination(props: {
  page: number;
  totalPages: number;
  onPageChange: Dispatch<SetStateAction<number>>;
}) {
  return (
    <View style={styles.pagination}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: props.page <= 1 }}
        disabled={props.page <= 1}
        onPress={() => props.onPageChange((current) => Math.max(1, current - 1))}
        style={[styles.secondaryButton, props.page <= 1 && styles.disabledButton]}
      >
        <Text style={styles.secondaryButtonText}>Precedent</Text>
      </Pressable>
      <Text style={styles.pageText}>Page {props.page} / {props.totalPages}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: props.page >= props.totalPages }}
        disabled={props.page >= props.totalPages}
        onPress={() => props.onPageChange((current) => Math.min(props.totalPages, current + 1))}
        style={[styles.secondaryButton, props.page >= props.totalPages && styles.disabledButton]}
      >
        <Text style={styles.secondaryButtonText}>Suivant</Text>
      </Pressable>
    </View>
  );
}

function sortLabel(sort: SortField) {
  const labels: Record<SortField, string> = {
    titre: "Titre",
    auteur: "Auteur",
    annee: "Annee",
    note: "Note"
  };

  return labels[sort];
}
