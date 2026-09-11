import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { NetworkStatusBar } from "../components/feedback/NetworkStatusBar";
import { Screen } from "../components/layout/Screen";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { ForbiddenBanner } from "../features/auth/ForbiddenBanner";
import { LoginScreen } from "../features/auth/LoginScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { I18nProvider, useTranslation } from "../services/i18n/I18nProvider";
import { hydrateQueryClient, persistQueryClient } from "../services/storage/queryPersister";
import { ThemeProvider, useThemeMode } from "../theme/ThemeProvider";

const queryClient = new QueryClient();

export function AppShell() {
  const [isCacheReady, setIsCacheReady] = useState(false);

  useEffect(() => {
    let annule = false;

    void hydrateQueryClient(queryClient).finally(() => {
      if (!annule) {
        setIsCacheReady(true);
      }
    });

    const arreterPersistance = persistQueryClient(queryClient);

    return () => {
      annule = true;
      arreterPersistance();
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NetworkStatusBar />
            {isCacheReady ? (
              <AuthProvider>
                <StatusBarForTheme />
                <ForbiddenBanner />
                <AuthGate />
              </AuthProvider>
            ) : (
              <LoadingScreen messageKey="app.loadingCache" />
            )}
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen messageKey="auth.loading" />;
  }

  if (status === "anonymous") {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}

function LoadingScreen({ messageKey }: { messageKey: "app.loadingCache" | "auth.loading" }) {
  const { t } = useTranslation();

  return (
    <Screen>
      <View>
        <Text>{t(messageKey)}</Text>
      </View>
    </Screen>
  );
}

function StatusBarForTheme() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}
