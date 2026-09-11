import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import { titreDepuisInconnu } from "../../domain/books/book";
import type { ErreurConflit } from "../../services/api/apiErrors";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import {
  bookFormSchema,
  bookToFormValues,
  conflictFromApi,
  emptyBookFormValues,
  formValuesToBookPayload,
  validationErrorsFromApi,
  type BookFormField,
  type BookFormValues
} from "./bookForm";
import { BookFormConflictPanel } from "./BookFormConflictPanel";
import { BooleanField, BookTextField, NoteField } from "./BookFormFields";
import { createStyles } from "./BookFormScreen.styles";
import { useBookDetail, useCreateBook, useUpdateBook } from "./useBooksQueries";

type BookFormScreenProps = {
  id?: string;
  mode: "create" | "edit";
  onCancel: () => void;
  onSaved: (id: string) => void;
};

/**
 * Conflit 409 rencontre lors d'une soumission EN LIGNE (voir
 * BookFormConflictPanel.tsx) : conserve les valeurs saisies pour permettre
 * un "reappliquer" sans ressaisie (aucune perte de saisie), et le
 * versionAttendue renvoye par le serveur pour rejouer avec la bonne base.
 */
type ConflitFormulaire = {
  erreur: ErreurConflit;
  valeurs: BookFormValues;
};

export function BookFormScreen({ id = "", mode, onCancel, onSaved }: BookFormScreenProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const isEdit = mode === "edit";
  const book = useBookDetail(id, isEdit);
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflit, setConflit] = useState<ConflitFormulaire | null>(null);
  const form = useForm<BookFormValues>({
    defaultValues: emptyBookFormValues,
    resolver: zodResolver(bookFormSchema)
  });

  useEffect(() => {
    if (isEdit && book.data) {
      form.reset(bookToFormValues(book.data));
    }
  }, [book.data, form, isEdit]);

  async function envoyer(livreId: string, values: BookFormValues, version: number) {
    setSubmitError(null);
    setConflit(null);
    const payload = formValuesToBookPayload(values);

    try {
      const updated = await updateBook.mutateAsync({ id: livreId, payload, version });
      onSaved(updated.id);
    } catch (error) {
      const conflitApi = conflictFromApi(error);
      if (conflitApi) {
        setConflit({ erreur: conflitApi, valeurs: values });
        return;
      }

      appliquerErreurFormulaire(error);
    }
  }

  function appliquerErreurFormulaire(error: unknown) {
    const fieldErrors = validationErrorsFromApi(error);
    const entries = Object.entries(fieldErrors) as [BookFormField, string][];

    if (entries.length === 0) {
      setSubmitError(t("bookForm.submitError"));
      return;
    }

    entries.forEach(([field, message]) => {
      form.setError(field, { message });
    });
  }

  async function submit(values: BookFormValues) {
    if (isEdit) {
      if (!book.data) {
        return;
      }
      await envoyer(book.data.id, values, book.data.version);
      return;
    }

    setSubmitError(null);
    try {
      const created = await createBook.mutateAsync(formValuesToBookPayload(values));
      onSaved(created.id);
    } catch (error) {
      appliquerErreurFormulaire(error);
    }
  }

  // Le serveur fait foi : on abandonne la saisie, la fiche (rechargee par
  // onCancel) reaffichera son etat actuel.
  function garderVersionServeur() {
    setConflit(null);
    onCancel();
  }

  // Renvoie la MEME saisie (valeurs conservees dans `conflit`, aucune
  // perte) mais avec le versionAttendue du serveur comme nouvelle base.
  function reappliquerModification() {
    if (!conflit || !book.data) {
      return;
    }
    const { erreur, valeurs } = conflit;
    void envoyer(book.data.id, valeurs, erreur.versionAttendue ?? book.data.version);
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
          message={t("bookForm.loadErrorMessage")}
          onRetry={() => void book.refetch()}
          title={t("bookForm.loadErrorTitle")}
        />
      </Screen>
    );
  }

  const isSaving = createBook.isPending || updateBook.isPending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backText}>{t("bookForm.backToDetail")}</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? t("bookForm.titleEdit") : t("bookForm.titleCreate")}</Text>

        <BookTextField control={form.control} error={form.formState.errors.titre?.message} name="titre" />
        <BookTextField control={form.control} error={form.formState.errors.auteur?.message} name="auteur" />
        <BookTextField control={form.control} error={form.formState.errors.editeur?.message} name="editeur" />
        <BookTextField
          control={form.control}
          error={form.formState.errors.annee?.message}
          keyboardType="numeric"
          name="annee"
        />
        <NoteField control={form.control} />
        <BooleanField control={form.control} labelKey="bookForm.fieldLu" name="lu" />
        <BooleanField control={form.control} labelKey="bookForm.fieldFavori" name="favori" />

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        {conflit ? (
          <BookFormConflictPanel
            onKeepServer={garderVersionServeur}
            onReapply={reappliquerModification}
            titre={titreDepuisInconnu(conflit.erreur.serveur)}
          />
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={t("common.save")}
            accessibilityRole="button"
            disabled={isSaving}
            onPress={form.handleSubmit(submit)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>{isSaving ? t("common.saving") : t("common.save")}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("common.cancel")}
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
