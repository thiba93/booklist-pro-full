import { StyleSheet } from "react-native";

import type { Theme } from "../../theme/theme";

export function createStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  disabledButton: {
    opacity: 0.4
  },
  filters: {
    gap: theme.spacing.sm
  },
  favoriteFilterActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  input: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    padding: theme.spacing.md
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  list: {
    gap: theme.spacing.sm
  },
  loadingNext: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textAlign: "center"
  },
  pageText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "center"
  },
  primaryButton: {
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
  row: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: theme.touch.min,
    padding: theme.spacing.md
  },
  rowMain: {
    flex: 1,
    gap: theme.spacing.xs
  },
  rowMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption
  },
  rowTitle: {
    color: theme.colors.textPrimary,
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
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  segment: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  segmentButton: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: theme.touch.min,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary
  },
  segmentButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textAlign: "center"
  },
  segmentButtonTextActive: {
    color: theme.colors.onAccent
  },
  statusButton: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.touch.min,
    minWidth: 76,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  statusButtonDone: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    textAlign: "center"
  },
  statusTextDone: {
    color: theme.colors.accent
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.display,
    fontWeight: "800"
  },
  coverThumb: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: theme.radius.sm,
    height: theme.touch.min,
    width: theme.touch.min
  }
  });
}
