import { Controller, useForm } from "react-hook-form";
import { Switch, Text, TextInput, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import type { TranslationKey } from "../../services/i18n/fr";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { BookFormField, BookFormValues } from "./bookForm";
import { createStyles } from "./BookFormScreen.styles";
import { StarRating } from "./StarRating";

/**
 * Champs de BookFormScreen, extraits dans leur propre fichier pour rester
 * sous la limite de 250 lignes imposee par lint:architecture - purement
 * organisationnel, aucune logique propre a ces composants.
 */

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

export function BookTextField({ control, error, keyboardType = "default", name }: FieldProps) {
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

export function NoteField({ control }: { control: ReturnType<typeof useForm<BookFormValues>>["control"] }) {
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

export function BooleanField({
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
