import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { EmptyState, LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import type { Note } from "../../services/api/schemas";
import { styles } from "./BookDetailScreen.styles";
import { useBookNotes, useCreateBookNote, useDeleteBookNote } from "./useBooksQueries";

type BookNotesPanelProps = {
  bookId: string;
};

export function BookNotesPanel({ bookId }: BookNotesPanelProps) {
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
      setError("La note n'a pas pu etre ajoutee.");
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Notes de lecture</Text>
      <TextInput
        accessibilityLabel="Nouvelle note de lecture"
        multiline
        onChangeText={setContenu}
        placeholder="Ajouter une note"
        returnKeyType="default"
        style={styles.noteInput}
        value={contenu}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: contenu.trim().length === 0 || createNote.isPending }}
        disabled={contenu.trim().length === 0 || createNote.isPending}
        onPress={submitNote}
        style={[
          styles.primaryButton,
          (contenu.trim().length === 0 || createNote.isPending) && styles.disabledButton
        ]}
      >
        <Text style={styles.primaryText}>{createNote.isPending ? "Ajout" : "Ajouter la note"}</Text>
      </Pressable>

      {notes.isLoading ? <LoadingSkeleton /> : null}
      {notes.isError ? (
        <RetryState
          message="Les notes de lecture n'ont pas pu etre chargees."
          onRetry={() => void notes.refetch()}
          title="Notes indisponibles"
        />
      ) : null}
      {notes.isSuccess && notes.data.length === 0 ? (
        <EmptyState
          message="Aucune note n'est encore associee a cet ouvrage."
          title="Aucune note"
        />
      ) : null}
      {notes.isSuccess && notes.data.length > 0 ? (
        <View style={styles.notesList}>
          {notes.data.map((note) => (
            <NoteRow
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

function NoteRow({ note, onDelete }: { note: Note; onDelete: () => void }) {
  return (
    <View style={styles.noteRow}>
      <View style={styles.noteContent}>
        <Text style={styles.noteDate}>{formatNoteDate(note.createdAt)}</Text>
        <Text style={styles.fieldValue}>{note.contenu}</Text>
      </View>
      <Pressable
        accessibilityLabel="Supprimer la note"
        accessibilityRole="button"
        onPress={onDelete}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>Supprimer</Text>
      </Pressable>
    </View>
  );
}

function formatNoteDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
