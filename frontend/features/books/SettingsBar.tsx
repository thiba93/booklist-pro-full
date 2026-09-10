import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

export function SettingsBar() {
  const { mode, theme, toggleMode } = useThemeMode();
  const { locale, setLocale, t } = useTranslation();
  const styles = createStyles(theme);
  const isDark = mode === "dark";

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityLabel={isDark ? t("theme.toggleToLight") : t("theme.toggleToDark")}
        accessibilityRole="button"
        accessibilityState={{ checked: isDark }}
        onPress={toggleMode}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{isDark ? t("theme.dark") : t("theme.light")}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={t("language.toggle")}
        accessibilityRole="button"
        onPress={() => setLocale(locale === "fr" ? "en" : "fr")}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{locale === "fr" ? t("language.fr") : t("language.en")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    button: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.sm
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    }
  });
}
