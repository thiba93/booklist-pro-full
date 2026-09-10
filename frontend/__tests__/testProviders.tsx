import type { ReactNode } from "react";

import { I18nProvider } from "../services/i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

/**
 * Regroupe les providers necessaires au rendu d'un composant de l'app
 * (theme clair/sombre, traductions). A combiner avec QueryClientProvider
 * dans les tests qui touchent aussi React Query.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
