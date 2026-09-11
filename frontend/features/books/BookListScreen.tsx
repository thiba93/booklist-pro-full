import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import type { Book } from "../../domain/books/book";
import { AccountBar } from "../auth/AccountBar";
import { useAuth } from "../auth/AuthProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useTranslation } from "../../services/i18n/I18nProvider";
import type { BooksQuery } from "../../services/api/booksApi";
import { useThemeMode } from "../../theme/ThemeProvider";
import {
  BookRows,
  FilterSegments,
  Pagination,
  SortSegments,
  type SortField,
  type StatusFilter
} from "./BookListParts";
import { createStyles } from "./BookListScreen.styles";
import { booksPageSize } from "./bookQueryKeys";
import { SettingsBar } from "./SettingsBar";
import { useBooksList, usePatchBook } from "./useBooksQueries";

type BookListScreenProps = {
  onCreate: () => void;
  onOpenBook: (id: string) => void;
};

export function BookListScreen({ onCreate, onOpenBook }: BookListScreenProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { canWrite } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("tous");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sort, setSort] = useState<SortField>("titre");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const debouncedQ = useDebouncedValue(q, 300);
  const patchBook = usePatchBook();

  const query = useMemo<BooksQuery>(() => {
    const baseQuery: BooksQuery = { page, limit: booksPageSize, q: debouncedQ, sort, order };
    const statusQuery = status === "tous" ? baseQuery : { ...baseQuery, status };
    return favoriteOnly ? { ...statusQuery, favori: true } : statusQuery;
  }, [debouncedQ, favoriteOnly, order, page, sort, status]);
  const books = useBooksList(query);
  const totalPages = books.data?.totalPages ?? 1;
  const pendingId = patchBook.isPending ? patchBook.variables?.id : undefined;

  function changeSearch(value: string) {
    setQ(value);
    setPage(1);
  }

  function changeStatus(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setPage(1);
  }

  function changeFavoriteOnly() {
    setFavoriteOnly((current) => !current);
    setPage(1);
  }

  function changeSort(nextSort: SortField) {
    setSort(nextSort);
    setPage(1);
  }

  const toggleRead = useCallback(
    (book: Book) => patchBook.mutate({ id: book.id, payload: { lu: !book.lu } }),
    [patchBook]
  );

  const toggleFavorite = useCallback(
    (book: Book) => patchBook.mutate({ id: book.id, payload: { favori: !book.favori } }),
    [patchBook]
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t("bookList.kicker")}</Text>
            <Text style={styles.title}>{t("bookList.title")}</Text>
          </View>
          <View style={styles.headerActions}>
            <AccountBar />
            <SettingsBar />
          </View>
        </View>

        <View style={styles.filters}>
          <TextInput
            accessibilityLabel={t("bookList.searchLabel")}
            inputMode="search"
            onChangeText={changeSearch}
            placeholder={t("bookList.searchPlaceholder")}
            returnKeyType="search"
            style={styles.input}
            value={q}
          />
          <FilterSegments status={status} onChange={changeStatus} />
          <Pressable
            accessibilityLabel={t("bookList.favoriteFilterLabel")}
            accessibilityRole="button"
            accessibilityState={{ checked: favoriteOnly }}
            onPress={changeFavoriteOnly}
            style={[styles.secondaryButton, favoriteOnly && styles.favoriteFilterActive]}
          >
            <Text style={styles.secondaryButtonText}>
              {favoriteOnly ? t("bookList.favoriteFilterOn") : t("bookList.favoriteFilterOff")}
            </Text>
          </Pressable>
          <SortSegments sort={sort} onChange={changeSort} />
          <Pressable
            accessibilityLabel={t("bookList.orderToggle")}
            accessibilityRole="button"
            onPress={() => setOrder((current) => (current === "asc" ? "desc" : "asc"))}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {order === "asc" ? t("bookList.orderAsc") : t("bookList.orderDesc")}
            </Text>
          </Pressable>
          {canWrite ? (
            <Pressable accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t("bookList.add")}</Text>
            </Pressable>
          ) : null}
        </View>

        {books.isLoading ? <LoadingSkeleton /> : null}
        {books.isFetching && !books.isLoading ? (
          <Text accessibilityLiveRegion="polite" style={styles.loadingNext}>
            {t("bookList.loadingNext")}
          </Text>
        ) : null}
        {books.isError ? (
          <RetryState
            message={t("bookList.errorMessage")}
            onRetry={() => void books.refetch()}
            title={t("bookList.errorTitle")}
          />
        ) : null}
        {books.isSuccess && books.data.items.length === 0 ? (
          <EmptyState
            message={
              q.trim().length > 0 || status !== "tous" || favoriteOnly
                ? t("bookList.emptyFiltered")
                : t("bookList.emptyGeneral")
            }
            title={t("bookList.emptyTitle")}
          />
        ) : null}
        {books.isSuccess && books.data.items.length > 0 ? (
          <BookRows
            books={books.data.items}
            canWrite={canWrite}
            pendingId={pendingId}
            onOpenBook={onOpenBook}
            onToggleFavorite={toggleFavorite}
            onToggleRead={toggleRead}
          />
        ) : null}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ScrollView>
    </Screen>
  );
}
