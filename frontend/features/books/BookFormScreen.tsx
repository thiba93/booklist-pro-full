import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import {
  bookFormSchema,
  bookToFormValues,
  emptyBookFormValues,
  formValuesToBookPayload,
  validationErrorsFromApi,
  type BookFormField,
  type BookFormValues
} from "./bookForm";
import { styles } from "./BookFormScreen.styles";
import { useBookDetail, useCreateBook, useUpdateBook } from "./useBooksQueries";

type BookFormScreenProps = {
  id?: string;
  mode: "create" | "edit";
  onCancel: () => void;
  onSaved: (id: string) => void;
};

export function BookFormScreen({ id = "", mode, onCancel, onSaved }: BookFormScreenProps) {
  const isEdit = mode === "edit";
  const book = useBookDetail(id, isEdit);
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<BookFormValues>({
    defaultValues: emptyBookFormValues,
    resolver: zodResolver(bookFormSchema)
  });

  useEffect(() => {
    if (isEdit && book.data) {
      form.reset(bookToFormValues(book.data));
    }
  }, [book.data, form, isEdit]);

  async function submit(values: BookFormValues) {
    setSubmitError(null);
    const payload = formValuesToBookPayload(values);

    try {
      if (isEdit) {
        if (!book.data) {
          return;
        }
        const updated = await updateBook.mutateAsync({
          id: book.data.id,
          payload,
          version: book.data.version
        });
        onSaved(updated.id);
      } else {
        const created = await createBook.mutateAsync(payload);
        onSaved(created.id);
      }
    } catch (error) {
      const fieldErrors = validationErrorsFromApi(error);
      const entries = Object.entries(fieldErrors) as [BookFormField, string][];

      if (entries.length === 0) {
        setSubmitError("L'ouvrage n'a pas pu etre enregistre.");
        return;
      }

      entries.forEach(([field, message]) => {
        form.setError(field, { message });
      });
    }
  }

  if (isEdit && book.isLoading) {
    return (
      <Screen>
        <LoadingSkeleton />
      </Screen>
    );
  }

  if (isEdit && book.isError) {
    return (
      <Screen>
        <RetryState
          message="Les donnees de l'ouvrage n'ont pas pu etre chargees."
          onRetry={() => void book.refetch()}
          title="Edition indisponible"
        />
      </Screen>
    );
  }

  const isSaving = createBook.isPending || updateBook.isPending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? "Modifier" : "Ajouter"} un ouvrage</Text>

        <BookTextField control={form.control} error={form.formState.errors.titre?.message} name="titre" />
        <BookTextField
          control={form.control}
          error={form.formState.errors.auteur?.message}
          name="auteur"
        />
        <BookTextField
          control={form.control}
          error={form.formState.errors.editeur?.message}
          name="editeur"
        />
        <BookTextField
          control={form.control}
          error={form.formState.errors.annee?.message}
          keyboardType="numeric"
          name="annee"
        />
        <BookTextField
          control={form.control}
          error={form.formState.errors.note?.message}
          keyboardType="numeric"
          name="note"
        />

        <BooleanField control={form.control} label="Lu" name="lu" />
        <BooleanField control={form.control} label="Favori" name="favori" />

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={form.handleSubmit(submit)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>{isSaving ? "Enregistrement" : "Enregistrer"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Annuler</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

type FieldProps = {
  control: ReturnType<typeof useForm<BookFormValues>>["control"];
  error?: string | undefined;
  keyboardType?: "default" | "numeric";
  name: Exclude<BookFormField, "lu" | "favori">;
};

function BookTextField({ control, error, keyboardType = "default", name }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{fieldLabel(name)}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TextInput
            keyboardType={keyboardType}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            style={styles.input}
            value={String(field.value)}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function BooleanField({
  control,
  label,
  name
}: {
  control: ReturnType<typeof useForm<BookFormValues>>["control"];
  label: string;
  name: Extract<BookFormField, "lu" | "favori">;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch onValueChange={field.onChange} value={Boolean(field.value)} />
        </View>
      )}
    />
  );
}

function fieldLabel(name: BookFormField) {
  const labels: Record<BookFormField, string> = {
    titre: "Titre",
    auteur: "Auteur",
    editeur: "Editeur",
    annee: "Annee",
    note: "Note",
    lu: "Lu",
    favori: "Favori"
  };

  return labels[name];
}
