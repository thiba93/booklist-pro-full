import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import type { Book } from "../../domain/books/book";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { BooksQuery } from "../../services/api/booksApi";
import {
  BookRows,
  FilterSegments,
  Pagination,
  SortSegments,
  type SortField,
  type StatusFilter
} from "./BookListParts";
import { styles } from "./BookListScreen.styles";
import { booksPageSize } from "./bookQueryKeys";
import { useBooksList, usePatchBook } from "./useBooksQueries";

type BookListScreenProps = {
  onCreate: () => void;
  onOpenBook: (id: string) => void;
};

export function BookListScreen({ onCreate, onOpenBook }: BookListScreenProps) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("tous");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sort, setSort] = useState<SortField>("titre");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const debouncedQ = useDebouncedValue(q, 300);
  const patchBook = usePatchBook();

  const query = useMemo<BooksQuery>(() => {
    const baseQuery: BooksQuery = {
      page,
      limit: booksPageSize,
      q: debouncedQ,
      sort,
      order
    };
    const statusQuery = status === "tous" ? baseQuery : { ...baseQuery, status };
    return favoriteOnly ? { ...statusQuery, favori: true } : statusQuery;
  }, [debouncedQ, favoriteOnly, order, page, sort, status]);
  const books = useBooksList(query);
  const totalPages = books.data?.totalPages ?? 1;

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

  function toggleRead(book: Book) {
    patchBook.mutate({ id: book.id, payload: { lu: !book.lu } });
  }

  function toggleFavorite(book: Book) {
    patchBook.mutate({ id: book.id, payload: { favori: !book.favori } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>BookList Pro</Text>
            <Text style={styles.title}>Ouvrages</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ajouter</Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          <TextInput
            accessibilityLabel="Rechercher par titre ou auteur"
            inputMode="search"
            onChangeText={changeSearch}
            placeholder="Titre ou auteur"
            returnKeyType="search"
            style={styles.input}
            value={q}
          />
          <FilterSegments status={status} onChange={changeStatus} />
          <Pressable
            accessibilityLabel="Filtrer les coups de coeur"
            accessibilityRole="button"
            accessibilityState={{ checked: favoriteOnly }}
            onPress={changeFavoriteOnly}
            style={[styles.secondaryButton, favoriteOnly && styles.favoriteFilterActive]}
          >
            <Text style={styles.secondaryButtonText}>
              {favoriteOnly ? "Coeurs seulement" : "Inclure tous"}
            </Text>
          </Pressable>
          <SortSegments sort={sort} onChange={changeSort} />
          <Pressable
            accessibilityLabel="Inverser l'ordre de tri"
            accessibilityRole="button"
            onPress={() => setOrder((current) => (current === "asc" ? "desc" : "asc"))}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Tri {order === "asc" ? "A-Z" : "Z-A"}</Text>
          </Pressable>
        </View>

        {books.isLoading ? <LoadingSkeleton /> : null}
        {books.isFetching && !books.isLoading ? (
          <Text accessibilityLiveRegion="polite" style={styles.loadingNext}>
            Chargement de la page...
          </Text>
        ) : null}
        {books.isError ? (
          <RetryState
            message="La liste des ouvrages n'a pas pu etre chargee."
            onRetry={() => void books.refetch()}
            title="Chargement impossible"
          />
        ) : null}
        {books.isSuccess && books.data.items.length === 0 ? (
          <EmptyState
            message={
              q.trim().length > 0 || status !== "tous" || favoriteOnly
                ? "Aucun ouvrage ne correspond aux filtres actifs."
                : "Ajoutez un premier ouvrage pour constituer la bibliotheque."
            }
            title="Aucun ouvrage"
          />
        ) : null}
        {books.isSuccess && books.data.items.length > 0 ? (
          <BookRows
            books={books.data.items}
            isMutating={patchBook.isPending}
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
