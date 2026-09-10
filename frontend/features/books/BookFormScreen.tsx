import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { LoadingSkeleton, RetryState } from "../../components/feedback/RequestStates";
import { Screen } from "../../components/layout/Screen";
import { useTranslation } from "../../services/i18n/I18nProvider";
import type { TranslationKey } from "../../services/i18n/fr";
import { useThemeMode } from "../../theme/ThemeProvider";
import {
  bookFormSchema,
  bookToFormValues,
  emptyBookFormValues,
  formValuesToBookPayload,
  validationErrorsFromApi,
  type BookFormField,
  type BookFormValues
} from "./bookForm";
import { createStyles } from "./BookFormScreen.styles";
import { StarRating } from "./StarRating";
import { useBookDetail, useCreateBook, useUpdateBook } from "./useBooksQueries";

type BookFormScreenProps = {
  id?: string;
  mode: "create" | "edit";
  onCancel: () => void;
  onSaved: (id: string) => void;
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
        setSubmitError(t("bookForm.submitError"));
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

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={form.handleSubmit(submit)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>{isSaving ? t("common.saving") : t("common.save")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
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
  name: Exclude<BookFormField, "lu" | "favori" | "note">;
};

const fieldLabelKeys: Record<FieldProps["name"], TranslationKey> = {
  titre: "bookForm.fieldTitre",
  auteur: "bookForm.fieldAuteur",
  editeur: "bookForm.fieldEditeur",
  annee: "bookForm.fieldAnnee"
};

function BookTextField({ control, error, keyboardType = "default", name }: FieldProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t(fieldLabelKeys[name])}</Text>
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

function NoteField({ control }: { control: ReturnType<typeof useForm<BookFormValues>>["control"] }) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t("bookForm.fieldNote")}</Text>
      <Controller
        control={control}
        name="note"
        render={({ field }) => {
          const current = field.value.trim().length > 0 ? Number(field.value) : 0;

          return (
            <StarRating
              onChange={(next) => field.onChange(next === current ? "" : String(next))}
              value={current > 0 ? current : null}
            />
          );
        }}
      />
    </View>
  );
}

function BooleanField({
  control,
  labelKey,
  name
}: {
  control: ReturnType<typeof useForm<BookFormValues>>["control"];
  labelKey: TranslationKey;
  name: Extract<BookFormField, "lu" | "favori">;
}) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.row}>
          <Text style={styles.label}>{t(labelKey)}</Text>
          <Switch onValueChange={field.onChange} value={Boolean(field.value)} />
        </View>
      )}
    />
  );
}
