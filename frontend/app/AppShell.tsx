import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { HomeScreen } from "../features/home/HomeScreen";

export function AppShell() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <HomeScreen />
    </ErrorBoundary>
  );
}
