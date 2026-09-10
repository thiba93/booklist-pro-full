import { useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";

import type { Book } from "../../domain/books/book";
import { resolveCoverUrl } from "../../services/covers/resolveCoverUrl";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { pickImageFile } from "../../services/media/pickImageFile";
import { resizeImageToDataUrl } from "../../services/media/resizeImage";
import { useThemeMode } from "../../theme/ThemeProvider";
import { createStyles } from "./BookDetailScreen.styles";
import { useDeleteBookCover, useUploadBookCover } from "./useBooksQueries";

type BookCoverPanelProps = {
  book: Book;
};

export function BookCoverPanel({ book }: BookCoverPanelProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const uploadCover = useUploadBookCover(book.id);
  const deleteCover = useDeleteBookCover(book.id);
  const [error, setError] = useState<string | null>(null);
  const isBusy = uploadCover.isPending || deleteCover.isPending;

  async function changeCover() {
    setError(null);

    try {
      const file = await pickImageFile();
      if (!file) {
        return;
      }
      const dataUrl = await resizeImageToDataUrl(file);
      await uploadCover.mutateAsync(dataUrl);
    } catch {
      setError(t("cover.uploadError"));
    }
  }

  async function removeCover() {
    setError(null);

    try {
      await deleteCover.mutateAsync();
    } catch {
      setError(t("cover.removeError"));
    }
  }

  return (
    <View style={styles.coverRow}>
      <Image
        accessibilityLabel={t("bookRow.coverAlt", { titre: book.titre })}
        source={{ uri: resolveCoverUrl(book.couverture, book.id) }}
        style={styles.cover}
      />
      <View style={styles.coverActions}>
        {Platform.OS === "web" ? (
          <>
            <Pressable
              accessibilityLabel={t("cover.changeLabel")}
              accessibilityRole="button"
              accessibilityState={{ busy: isBusy }}
              disabled={isBusy}
              onPress={() => void changeCover()}
              style={[styles.secondaryButton, isBusy && styles.disabledButton]}
            >
              <Text style={styles.secondaryText}>
                {uploadCover.isPending ? t("cover.uploading") : t("cover.changeLabel")}
              </Text>
            </Pressable>
            {book.couverture ? (
              <Pressable
                accessibilityLabel={t("cover.removeLabel")}
                accessibilityRole="button"
                accessibilityState={{ busy: isBusy }}
                disabled={isBusy}
                onPress={() => void removeCover()}
                style={[styles.secondaryButton, isBusy && styles.disabledButton]}
              >
                <Text style={styles.secondaryText}>
                  {deleteCover.isPending ? t("cover.removing") : t("cover.removeLabel")}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={styles.textMuted}>{t("cover.webOnly")}</Text>
        )}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}
