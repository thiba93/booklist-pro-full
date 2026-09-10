import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { HomeScreen } from "../features/home/HomeScreen";

const queryClient = new QueryClient();

export function AppShell() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <HomeScreen />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
