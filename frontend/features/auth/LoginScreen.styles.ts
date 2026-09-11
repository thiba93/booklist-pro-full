import { StyleSheet } from "react-native";

import type { Theme } from "../../theme/theme";

export function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      alignSelf: "center",
      flex: 1,
      gap: theme.spacing.lg,
      justifyContent: "center",
      maxWidth: 360,
      width: "100%"
    },
    disabledButton: {
      opacity: 0.5
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.caption
    },
    field: {
      gap: theme.spacing.xs
    },
    input: {
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      padding: theme.spacing.md
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.sm,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    primaryButtonText: {
      color: theme.colors.onAccent,
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.display,
      fontWeight: "800"
    }
  });
}
