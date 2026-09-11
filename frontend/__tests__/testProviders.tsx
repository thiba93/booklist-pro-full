import type { ReactNode } from "react";

import { AuthContext, type AuthContextValue } from "../features/auth/AuthProvider";
import { I18nProvider } from "../services/i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

/**
 * Utilisateur editeur par defaut pour les tests : evite de dupliquer un
 * flux de connexion reseau dans chaque suite qui rend un ecran de livres.
 * Passer `authOverrides` (ex. { canWrite: false }) pour simuler un lecteur.
 */
const defaultAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: "test-user", email: "editeur@booklist.fr", role: "editeur", authRequise: true },
  canWrite: true,
  loginError: null,
  forbiddenMessage: null,
  login: async () => undefined,
  logout: () => undefined,
  dismissForbidden: () => undefined
};

/**
 * Regroupe les providers necessaires au rendu d'un composant de l'app
 * (theme clair/sombre, traductions, session). A combiner avec
 * QueryClientProvider dans les tests qui touchent aussi React Query.
 */
export function AppProviders({
  authOverrides,
  children
}: {
  authOverrides?: Partial<AuthContextValue>;
  children: ReactNode;
}) {
  const authValue: AuthContextValue = { ...defaultAuthValue, ...authOverrides };

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
      </I18nProvider>
    </ThemeProvider>
  );
}
