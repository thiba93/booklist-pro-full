import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import { BookNotesPanel } from "./BookNotesPanel";
import { styles } from "./BookDetailScreen.styles";
import { useBookDetail, useDeleteBook, usePatchBook } from "./useBooksQueries";

type BookDetailScreenProps = {
  id: string;
  onBack: () => void;
  onDeleted: () => void;
  onEdit: () => void;
};

export function BookDetailScreen({ id, onBack, onDeleted, onEdit }: BookDetailScreenProps) {
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
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {book.isLoading ? <LoadingSkeleton /> : null}

        {book.isError ? (
          <RetryState
            message="La fiche de cet ouvrage n'a pas pu etre chargee."
            onRetry={() => void book.refetch()}
            title="Fiche indisponible"
          />
        ) : null}

        {book.isSuccess && !book.data ? (
          <EmptyState
            message="Cet ouvrage n'existe plus dans la bibliotheque."
            title="Ouvrage introuvable"
          />
        ) : null}

        {book.isSuccess && book.data ? (
          <>
            <View>
              <Text style={styles.status}>{book.data.lu ? "Lu" : "Non lu"}</Text>
              <Text style={styles.title}>{book.data.titre}</Text>
              <Text style={styles.textMuted}>{book.data.auteur}</Text>
            </View>

            <View style={styles.panel}>
              <Info label="Editeur" value={book.data.editeur || "Non renseigne"} />
              <Info label="Annee" value={String(book.data.annee)} />
              <Info label="Note" value={book.data.note === null ? "Non notee" : `${book.data.note}/5`} />
              <Info label="Version" value={String(book.data.version)} />
            </View>

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onEdit} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Modifier</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: patchBook.isPending, checked: book.data.lu }}
                disabled={patchBook.isPending}
                onPress={toggleRead}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>
                  {book.data.lu ? "Marquer non lu" : "Marquer lu"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={
                  book.data.favori ? "Retirer des coups de coeur" : "Ajouter aux coups de coeur"
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
                <Text style={styles.dangerText}>Supprimer</Text>
              </Pressable>
            </View>

            <BookNotesPanel bookId={id} />

            {deleteStep === "confirm" ? (
              <View style={styles.panel}>
                <Text style={styles.textMuted}>Confirmer la suppression de cet ouvrage.</Text>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleteStep("scheduled")}
                    style={styles.dangerButton}
                  >
                    <Text style={styles.dangerText}>Confirmer</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleteStep("idle")}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {deleteStep === "scheduled" ? (
              <View style={styles.panel}>
                <Text style={styles.textMuted}>
                  Suppression dans {remainingSeconds} secondes.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteStep("idle")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Annuler la suppression</Text>
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
  return (
    <View style={styles.grid}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}
