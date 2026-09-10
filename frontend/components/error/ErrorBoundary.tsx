import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  errorMessage: string | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    errorMessage: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error.message };
  }

  public override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  public override render() {
    if (this.state.errorMessage === null) {
      return this.props.children;
    }

    return <ErrorFallback message={this.state.errorMessage} onRetry={this.reset} />;
  }

  private readonly reset = () => {
    this.setState({ errorMessage: null });
  };
}

function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("appError.title")}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.sm,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm
    },
    buttonText: {
      color: theme.colors.onAccent,
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    container: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      flex: 1,
      gap: theme.spacing.md,
      justifyContent: "center",
      padding: theme.spacing.xl
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
      textAlign: "center"
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.title,
      fontWeight: "700",
      textAlign: "center"
    }
  });
}
