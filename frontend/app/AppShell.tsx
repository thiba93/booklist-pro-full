import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { Screen } from "../components/layout/Screen";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { ForbiddenBanner } from "../features/auth/ForbiddenBanner";
import { LoginScreen } from "../features/auth/LoginScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { I18nProvider, useTranslation } from "../services/i18n/I18nProvider";
import { ThemeProvider, useThemeMode } from "../theme/ThemeProvider";

const queryClient = new QueryClient();

export function AppShell() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBarForTheme />
              <ForbiddenBanner />
              <AuthGate />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <Screen>
        <View>
          <Text>{t("auth.loading")}</Text>
        </View>
      </Screen>
    );
  }

  if (status === "anonymous") {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}

function StatusBarForTheme() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}
