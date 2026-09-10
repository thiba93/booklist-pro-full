import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { HomeScreen } from "../features/home/HomeScreen";
import { I18nProvider } from "../services/i18n/I18nProvider";
import { ThemeProvider, useThemeMode } from "../theme/ThemeProvider";

const queryClient = new QueryClient();

export function AppShell() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <StatusBarForTheme />
            <HomeScreen />
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  );
}

function StatusBarForTheme() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}
