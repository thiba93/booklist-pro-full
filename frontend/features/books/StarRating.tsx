import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type StarRatingProps = {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
};

export function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const current = value ?? 0;
  const summary = value === null ? t("rating.unset") : t("rating.value", { value });

  if (readOnly) {
    return (
      <View accessible accessibilityLabel={summary} style={styles.group}>
        {STAR_VALUES.map((star) => (
          <Text key={star} style={[styles.glyph, star <= current ? styles.filled : styles.empty]}>
            {star <= current ? "★" : "☆"}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View accessibilityLabel={t("rating.label")} accessibilityRole="adjustable" style={styles.group}>
      {STAR_VALUES.map((star) => (
        <Pressable
          accessibilityLabel={t("rating.star", { value: star })}
          accessibilityRole="button"
          accessibilityState={{ selected: star === current }}
          key={star}
          onPress={() => onChange?.(star)}
          style={styles.star}
        >
          <Text style={[styles.glyph, star <= current ? styles.filled : styles.empty]}>
            {star <= current ? "★" : "☆"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    empty: {
      color: theme.colors.starEmpty
    },
    filled: {
      color: theme.colors.starFilled
    },
    glyph: {
      fontSize: theme.typography.title
    },
    group: {
      flexDirection: "row"
    },
    star: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: theme.touch.min,
      minWidth: theme.touch.min
    }
  });
}
