import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

type BookFormConflictPanelProps = {
  titre: string | null;
  onKeepServer: () => void;
  onReapply: () => void;
};

/**
 * Conflit 409 rencontre en editant un ouvrage EN LIGNE (PUT /books/:id
 * avec un If-Match perime : quelqu'un a modifie le meme livre entre le
 * chargement du formulaire et la soumission). Distinct de
 * features/sync/ConflictPanel.tsx (conflits de la file hors ligne, resolus
 * par comparaison d'horodatage - voir deciderSortMutationConflit) : ici
 * l'utilisateur est present et en ligne au moment du conflit, donc aucune
 * decision automatique n'est prise - les deux issues lui sont toujours
 * proposees (le serveur renvoie systematiquement `serveur`+`versionAttendue`
 * sur ce point d'entree, pas de cas degrade comme pour /sync).
 */
export function BookFormConflictPanel({ titre, onKeepServer, onReapply }: BookFormConflictPanelProps) {
  const { t } = useTranslation();
  const { theme } = useThemeMode();
  const styles = createStyles(theme);

  return (
    <View style={styles.panel}>
      <Text style={styles.message}>
        {titre ? t("syncConflict.messageWithTitle", { titre }) : t("syncConflict.messageGeneric")}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t("syncConflict.keepServer")}
          accessibilityRole="button"
          onPress={onKeepServer}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>{t("syncConflict.keepServer")}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("syncConflict.reapply")}
          accessibilityRole="button"
          onPress={onReapply}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>{t("syncConflict.reapply")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    message: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.danger,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.sm,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.sm
    },
    primaryText: {
      color: theme.colors.onAccent,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    secondaryButton: {
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.sm
    },
    secondaryText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    }
  });
}
