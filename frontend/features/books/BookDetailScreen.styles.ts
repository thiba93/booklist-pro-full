import { StyleSheet } from "react-native";

import { theme } from "../../theme/theme";

export const styles = StyleSheet.create({
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
  dangerButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    minHeight: theme.touch.min,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  dangerText: {
    color: theme.colors.onAccent,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.4
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  fieldValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body
  },
  heartButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.touch.min,
    minWidth: theme.touch.min
  },
  heartButtonActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent
  },
  heartText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.title,
    fontWeight: "700"
  },
  heartTextActive: {
    color: theme.colors.accent
  },
  grid: {
    gap: theme.spacing.md
  },
  panel: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  noteContent: {
    flex: 1,
    gap: theme.spacing.xs
  },
  noteDate: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700"
  },
  noteInput: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    minHeight: theme.touch.min * 2,
    padding: theme.spacing.md
  },
  noteRow: {
    alignItems: "flex-start",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: theme.touch.min,
    padding: theme.spacing.md
  },
  notesList: {
    gap: theme.spacing.sm
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
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title,
    fontWeight: "800"
  },
  status: {
    color: theme.colors.accent,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  textMuted: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    lineHeight: 22
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.display,
    fontWeight: "800"
  }
});
