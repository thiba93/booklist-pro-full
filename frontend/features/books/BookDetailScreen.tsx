import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import { useAuth } from "../auth/AuthProvider";
import { BookCoverPanel } from "./BookCoverPanel";
import { BookEnrichmentPanel } from "./BookEnrichmentPanel";
import { BookNotesPanel } from "./BookNotesPanel";
import { createStyles } from "./BookDetailScreen.styles";
import { StarRating } from "./StarRating";
import { useBookDetail, useDeleteBook, usePatchBook } from "./useBooksQueries";

type BookDetailScreenProps = {
  id: string;
  onBack: () => void;
  onDeleted: () => void;
  onEdit: () => void;
};

export function BookDetailScreen({ id, onBack, onDeleted, onEdit }: BookDetailScreenProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  // Role lecteur : le bloc entier d'actions d'ecriture (modifier, marquer
  // lu, favori, supprimer) est masque plus bas, pas seulement desactive -
  // consigne "aucune action d'ecriture visible" du role lecteur.
  const { canWrite } = useAuth();
  const book = useBookDetail(id);
  const patchBook = usePatchBook();
  const deleteBook = useDeleteBook();
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "scheduled">("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(5);

  useEffect(() => {
    if (deleteStep !== "scheduled") {
      return;
    }

    setRemainingSeconds(5);
    const intervalId = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    const timeoutId = setTimeout(() => {
      deleteBook.mutate(id, { onSuccess: onDeleted });
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [deleteBook, deleteStep, id, onDeleted]);

  function toggleRead() {
    if (book.data) {
      patchBook.mutate({ id, payload: { lu: !book.data.lu } });
    }
  }

  function toggleFavorite() {
    if (book.data) {
      patchBook.mutate({ id, payload: { favori: !book.data.favori } });
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>

        {book.isLoading ? <LoadingSkeleton /> : null}

        {book.isError ? (
          <RetryState
            message={t("bookDetail.errorMessage")}
            onRetry={() => void book.refetch()}
            title={t("bookDetail.errorTitle")}
          />
        ) : null}

        {book.isSuccess && !book.data ? (
          <EmptyState message={t("bookDetail.notFoundMessage")} title={t("bookDetail.notFoundTitle")} />
        ) : null}

        {book.isSuccess && book.data ? (
          <>
            <View>
              <Text style={styles.status}>
                {book.data.lu ? t("bookRow.statusRead") : t("bookRow.statusUnread")}
              </Text>
              <Text style={styles.title}>{book.data.titre}</Text>
              <Text style={styles.textMuted}>{book.data.auteur}</Text>
            </View>

            <BookCoverPanel book={book.data} />

            <View style={styles.panel}>
              <Info label={t("bookDetail.publisher")} value={book.data.editeur || t("bookDetail.publisherEmpty")} />
              <Info label={t("bookDetail.year")} value={String(book.data.annee)} />
              <View style={styles.grid}>
                <Text style={styles.fieldLabel}>{t("bookDetail.note")}</Text>
                <StarRating readOnly value={book.data.note} />
              </View>
              <Info label={t("bookDetail.version")} value={String(book.data.version)} />
            </View>

            {canWrite ? (
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={onEdit} style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{t("bookDetail.edit")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: patchBook.isPending, checked: book.data.lu }}
                  disabled={patchBook.isPending}
                  onPress={toggleRead}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>
                    {book.data.lu ? t("bookRow.markUnread") : t("bookRow.markRead")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={
                    book.data.favori ? t("bookDetail.removeFavorite") : t("bookDetail.addFavorite")
                  }
                  accessibilityRole="button"
                  accessibilityState={{ busy: patchBook.isPending, checked: book.data.favori }}
                  disabled={patchBook.isPending}
                  onPress={toggleFavorite}
                  style={[styles.heartButton, book.data.favori && styles.heartButtonActive]}
                >
                  <Text style={[styles.heartText, book.data.favori && styles.heartTextActive]}>
                    {book.data.favori ? "♥" : "♡"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteStep("confirm")}
                  style={styles.dangerButton}
                >
                  <Text style={styles.dangerText}>{t("bookDetail.delete")}</Text>
                </Pressable>
              </View>
            ) : null}

            <BookNotesPanel bookId={id} />

            <BookEnrichmentPanel auteur={book.data.auteur} titre={book.data.titre} />

            {canWrite && deleteStep === "confirm" ? (
              <View style={styles.panel}>
                <Text style={styles.textMuted}>{t("bookDetail.confirmDeleteMessage")}</Text>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleteStep("scheduled")}
                    style={styles.dangerButton}
                  >
                    <Text style={styles.dangerText}>{t("common.confirm")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleteStep("idle")}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {canWrite && deleteStep === "scheduled" ? (
              <View style={styles.panel}>
                <Text style={styles.textMuted}>
                  {t("bookDetail.deleteScheduled", { seconds: remainingSeconds })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteStep("idle")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>{t("bookDetail.cancelDelete")}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { theme } = useThemeMode();
  const styles = createStyles(theme);

  return (
    <View style={styles.grid}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}
