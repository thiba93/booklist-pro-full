import { StyleSheet } from "react-native";

import type { Theme } from "../../theme/theme";

export function createStyles(theme: Theme) {
  return StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: theme.touch.min,
    paddingVertical: theme.spacing.sm
  },
  backText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
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
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    minHeight: theme.touch.min,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  primaryText: {
    color: theme.colors.onAccent,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  secondaryButton: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.touch.min,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  secondaryText: {
    color: theme.colors.textPrimary,
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
