import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { Book } from "../../domain/books/book";
import { resolveCoverUrl } from "../../services/covers/resolveCoverUrl";
import { useTranslation } from "../../services/i18n/I18nProvider";
import type { BooksQuery } from "../../services/api/booksApi";
import { useThemeMode } from "../../theme/ThemeProvider";
import { createStyles } from "./BookListScreen.styles";

export type StatusFilter = "tous" | "lu" | "nonlu";
export type SortField = Exclude<NonNullable<BooksQuery["sort"]>, "updatedAt">;

export function FilterSegments(props: { status: StatusFilter; onChange: (status: StatusFilter) => void }) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const labels: Record<StatusFilter, string> = {
    tous: t("bookList.filterAll"),
    lu: t("bookList.filterRead"),
    nonlu: t("bookList.filterUnread")
  };

  return (
    <View style={styles.segment}>
      {(["tous", "lu", "nonlu"] as const).map((item) => (
        <Pressable
          accessibilityLabel={t("bookList.filterLabel", { status: labels[item] })}
          accessibilityRole="button"
          accessibilityState={{ selected: props.status === item }}
          key={item}
          onPress={() => props.onChange(item)}
          style={[styles.segmentButton, props.status === item && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentButtonText, props.status === item && styles.segmentButtonTextActive]}>
            {labels[item]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SortSegments(props: { sort: SortField; onChange: (sort: SortField) => void }) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const labels: Record<SortField, string> = {
    titre: t("bookList.sortTitle"),
    auteur: t("bookList.sortAuthor"),
    annee: t("bookList.sortYear"),
    note: t("bookList.sortNote")
  };

  return (
    <View style={styles.segment}>
      {(["titre", "auteur", "annee", "note"] as const).map((item) => (
        <Pressable
          accessibilityLabel={t("bookList.sortLabel", { field: labels[item] })}
          accessibilityRole="button"
          accessibilityState={{ selected: props.sort === item }}
          key={item}
          onPress={() => props.onChange(item)}
          style={[styles.segmentButton, props.sort === item && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentButtonText, props.sort === item && styles.segmentButtonTextActive]}>
            {labels[item]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type BookRowProps = {
  book: Book;
  isMutating: boolean;
  onOpenBook: (id: string) => void;
  onToggleFavorite: (book: Book) => void;
  onToggleRead: (book: Book) => void;
};

/**
 * Memoise : dans usePatchBook, seul le livre modifie recoit une nouvelle
 * reference dans la liste (voir applyPatch). Les autres lignes gardent
 * une reference `book` identique et sautent leur rendu grace a ce memo.
 */
export const BookRow = memo(function BookRow({
  book,
  isMutating,
  onOpenBook,
  onToggleFavorite,
  onToggleRead
}: BookRowProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      <Image
        accessibilityLabel={t("bookRow.coverAlt", { titre: book.titre })}
        source={{ uri: resolveCoverUrl(book.couverture, book.id) }}
        style={styles.coverThumb}
      />
      <Pressable
        accessibilityLabel={t("bookRow.open", { titre: book.titre })}
        accessibilityRole="button"
        onPress={() => onOpenBook(book.id)}
        style={styles.rowMain}
      >
        <Text style={styles.rowTitle}>{book.titre}</Text>
        <Text style={styles.rowMeta}>{book.auteur} - {book.annee}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={book.lu ? t("bookRow.markUnread") : t("bookRow.markRead")}
        accessibilityRole="button"
        accessibilityState={{ checked: book.lu, busy: isMutating }}
        onPress={() => onToggleRead(book)}
        style={[styles.statusButton, book.lu && styles.statusButtonDone]}
      >
        <Text style={[styles.statusText, book.lu && styles.statusTextDone]}>
          {book.lu ? t("bookRow.statusRead") : t("bookRow.statusUnread")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={book.favori ? t("bookRow.removeFavorite") : t("bookRow.addFavorite")}
        accessibilityRole="button"
        accessibilityState={{ checked: book.favori, busy: isMutating }}
        onPress={() => onToggleFavorite(book)}
        style={[styles.heartButton, book.favori && styles.heartButtonActive]}
      >
        <Text style={[styles.heartText, book.favori && styles.heartTextActive]}>
          {book.favori ? "♥" : "♡"}
        </Text>
      </Pressable>
    </View>
  );
});

export function BookRows(props: {
  books: Book[];
  pendingId?: string | undefined;
  onOpenBook: (id: string) => void;
  onToggleFavorite: (book: Book) => void;
  onToggleRead: (book: Book) => void;
}) {
  const { theme } = useThemeMode();
  const styles = createStyles(theme);

  return (
    <View style={styles.list}>
      {props.books.map((book) => (
        <BookRow
          book={book}
          isMutating={book.id === props.pendingId}
          key={book.id}
          onOpenBook={props.onOpenBook}
          onToggleFavorite={props.onToggleFavorite}
          onToggleRead={props.onToggleRead}
        />
      ))}
    </View>
  );
}

export function Pagination(props: {
  page: number;
  totalPages: number;
  onPageChange: Dispatch<SetStateAction<number>>;
}) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.pagination}>
      <Pressable
        accessibilityLabel={t("pagination.previous")}
        accessibilityRole="button"
        accessibilityState={{ disabled: props.page <= 1 }}
        disabled={props.page <= 1}
        onPress={() => props.onPageChange((current) => Math.max(1, current - 1))}
        style={[styles.secondaryButton, props.page <= 1 && styles.disabledButton]}
      >
        <Text style={styles.secondaryButtonText}>{t("pagination.previous")}</Text>
      </Pressable>
      <Text style={styles.pageText}>
        {t("pagination.pageOf", { page: props.page, totalPages: props.totalPages })}
      </Text>
      <Pressable
        accessibilityLabel={t("pagination.next")}
        accessibilityRole="button"
        accessibilityState={{ disabled: props.page >= props.totalPages }}
        disabled={props.page >= props.totalPages}
        onPress={() => props.onPageChange((current) => Math.min(props.totalPages, current + 1))}
        style={[styles.secondaryButton, props.page >= props.totalPages && styles.disabledButton]}
      >
        <Text style={styles.secondaryButtonText}>{t("pagination.next")}</Text>
      </Pressable>
    </View>
  );
}
