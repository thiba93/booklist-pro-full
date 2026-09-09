import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/layout/Screen";
import { theme } from "../../theme/theme";

export function HomeScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Bibliotheque personnelle</Text>
        <Text style={styles.title}>BookList Pro</Text>
        <Text style={styles.subtitle}>
          Un socle Expo Web pret pour organiser, lire et synchroniser une
          collection de livres.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "flex-start",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    maxWidth: 720,
    padding: theme.spacing.lg,
    width: "100%"
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    lineHeight: 24
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.display,
    fontWeight: "800"
  }
});
