import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme/theme";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  errorMessage: string | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
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

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Une erreur est survenue.</Text>
        <Text style={styles.message}>{this.state.errorMessage}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.reset}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Reessayer</Text>
        </Pressable>
      </View>
    );
  }

  private readonly reset = () => {
    this.setState({ errorMessage: null });
  };
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
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
