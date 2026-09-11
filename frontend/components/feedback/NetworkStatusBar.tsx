import { StyleSheet, Text, View } from "react-native";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

type NetworkStatusBarProps = {
  hasConflict?: boolean;
  pendingCount?: number;
};

/**
 * Indicateur permanent (toujours affiche, en ligne ou non) de l'etat de la
 * synchronisation : connectivite, mutations hors ligne en attente, et
 * conflits a resoudre. `pendingCount`/`hasConflict` seront alimentes par la
 * file de mutations (etape suivante) ; en attendant ils restent a defaut.
 */
export function NetworkStatusBar({ hasConflict = false, pendingCount = 0 }: NetworkStatusBarProps) {
  const isOnline = useNetworkStatus();
  const { t } = useTranslation();
  const { theme } = useThemeMode();
  const styles = createStyles(theme, isOnline, hasConflict);

  const parts = [isOnline ? t("network.online") : t("network.offline")];

  if (pendingCount > 0) {
    parts.push(t("network.pending", { count: pendingCount }));
  }

  if (hasConflict) {
    parts.push(t("network.conflict"));
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.bar}>
      <Text style={styles.text}>{parts.join(" · ")}</Text>
    </View>
  );
}

function createStyles(theme: Theme, isOnline: boolean, hasConflict: boolean) {
  return StyleSheet.create({
    bar: {
      alignItems: "center",
      alignSelf: "stretch",
      backgroundColor: hasConflict
        ? theme.colors.danger
        : isOnline
          ? theme.colors.accentSoft
          : theme.colors.skeletonStrong,
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      width: "100%"
    },
    text: {
      color: hasConflict ? theme.colors.onAccent : theme.colors.textPrimary,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    }
  });
}
