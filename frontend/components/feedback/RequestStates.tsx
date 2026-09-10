import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme/theme";

type RetryStateProps = {
  title: string;
  message: string;
  onRetry: () => void;
};

type EmptyStateProps = {
  title: string;
  message: string;
};

export function LoadingSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  );
}

export function RetryState({ title, message, onRetry }: RetryStateProps) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Reessayer</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    minHeight: theme.touch.min,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: "center"
  },
  buttonText: {
    color: theme.colors.onAccent,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    lineHeight: 22,
    textAlign: "center"
  },
  skeletonRow: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  skeletonText: {
    backgroundColor: theme.colors.skeleton,
    borderRadius: theme.radius.sm,
    height: 14,
    width: "65%"
  },
  skeletonTitle: {
    backgroundColor: theme.colors.skeletonStrong,
    borderRadius: theme.radius.sm,
    height: 20,
    width: "45%"
  },
  stack: {
    gap: theme.spacing.md
  },
  state: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title,
    fontWeight: "700",
    textAlign: "center"
  }
});
