import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { useTranslation } from "../../services/i18n/I18nProvider";
import type { Note } from "../../services/api/schemas";
import { useThemeMode } from "../../theme/ThemeProvider";
import { useAuth } from "../auth/AuthProvider";
import { createStyles } from "./BookDetailScreen.styles";
import { useBookNotes, useCreateBookNote, useDeleteBookNote } from "./useBookNotesQueries";

type BookNotesPanelProps = {
  bookId: string;
};

export function BookNotesPanel({ bookId }: BookNotesPanelProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  // Lecteur : ni le champ de saisie ni le bouton "ajouter" ne s'affichent
  // plus bas, et chaque note perd son bouton de suppression.
  const { canWrite } = useAuth();
  const notes = useBookNotes(bookId);
  const createNote = useCreateBookNote(bookId);
  const deleteNote = useDeleteBookNote(bookId);
  const [contenu, setContenu] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitNote() {
    setError(null);

    try {
      await createNote.mutateAsync(contenu);
      setContenu("");
    } catch {
      setError(t("bookNotes.addError"));
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t("bookNotes.title")}</Text>
      {canWrite ? (
        <>
          <TextInput
            accessibilityLabel={t("bookNotes.inputLabel")}
            multiline
            onChangeText={setContenu}
            placeholder={t("bookNotes.inputPlaceholder")}
            returnKeyType="default"
            style={styles.noteInput}
            value={contenu}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            accessibilityLabel={t("bookNotes.add")}
            accessibilityRole="button"
            accessibilityState={{ disabled: contenu.trim().length === 0 || createNote.isPending }}
            disabled={contenu.trim().length === 0 || createNote.isPending}
            onPress={submitNote}
            style={[
              styles.primaryButton,
              (contenu.trim().length === 0 || createNote.isPending) && styles.disabledButton
            ]}
          >
            <Text style={styles.primaryText}>
              {createNote.isPending ? t("bookNotes.adding") : t("bookNotes.add")}
            </Text>
          </Pressable>
        </>
      ) : null}

      {notes.isLoading ? <LoadingSkeleton /> : null}
      {notes.isError ? (
        <RetryState
          message={t("bookNotes.errorMessage")}
          onRetry={() => void notes.refetch()}
          title={t("bookNotes.errorTitle")}
        />
      ) : null}
      {notes.isSuccess && notes.data.length === 0 ? (
        <EmptyState message={t("bookNotes.emptyMessage")} title={t("bookNotes.emptyTitle")} />
      ) : null}
      {notes.isSuccess && notes.data.length > 0 ? (
        <View style={styles.notesList}>
          {notes.data.map((note) => (
            <NoteRow
              canWrite={canWrite}
              key={note.id}
              note={note}
              onDelete={() => deleteNote.mutate(note.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function NoteRow({
  canWrite,
  note,
  onDelete
}: {
  canWrite: boolean;
  note: Note;
  onDelete: () => void;
}) {
  const { theme } = useThemeMode();
  const { locale, t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.noteRow}>
      <View style={styles.noteContent}>
        <Text style={styles.noteDate}>{formatNoteDate(note.createdAt, locale)}</Text>
        <Text style={styles.fieldValue}>{note.contenu}</Text>
      </View>
      {canWrite ? (
        <Pressable
          accessibilityLabel={t("bookNotes.delete")}
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>{t("bookNotes.delete")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatNoteDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
