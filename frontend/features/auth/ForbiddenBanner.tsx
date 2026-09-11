import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";
import { useAuth } from "./AuthProvider";

/**
 * Affichage global et immediat des 403 : quel que soit l'ecran qui a
 * declenche l'appel, l'utilisateur voit clairement que l'action lui est
 * refusee plutot que de rencontrer un echec silencieux.
 */
export function ForbiddenBanner() {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { dismissForbidden, forbiddenMessage } = useAuth();

  if (!forbiddenMessage) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{forbiddenMessage}</Text>
      <Pressable accessibilityRole="button" onPress={dismissForbidden} style={styles.dismiss}>
        <Text style={styles.dismissText}>{t("auth.forbiddenDismiss")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    banner: {
      alignItems: "center",
      backgroundColor: theme.colors.danger,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm
    },
    dismiss: {
      minHeight: theme.touch.min,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm
    },
    dismissText: {
      color: theme.colors.onAccent,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    message: {
      color: theme.colors.onAccent,
      flex: 1,
      fontSize: theme.typography.body
    }
  });
}
