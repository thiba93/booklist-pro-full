import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";
import { useAuth } from "./AuthProvider";

/**
 * Petit indicateur de session : email du compte connecte + bouton de
 * deconnexion. Affiche uniquement quand un utilisateur est authentifie
 * (rend `null` sinon, ex. pendant la restauration de session au demarrage)
 * pour eviter un flash "aucun email" avant que AuthProvider ait resolu
 * l'etat initial.
 */
export function AccountBar() {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { logout, user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <Text style={styles.email} numberOfLines={1}>
        {user.email}
      </Text>
      <Pressable accessibilityLabel={t("auth.logout")} accessibilityRole="button" onPress={logout} style={styles.button}>
        <Text style={styles.buttonText}>{t("auth.logout")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      alignItems: "center",
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
    },
    email: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.caption,
      maxWidth: 140
    }
  });
}
