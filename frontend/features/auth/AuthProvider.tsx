import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ApiError } from "../../services/api/apiErrors";
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refreshAuth,
  type LoginPayload
} from "../../services/api/authApi";
import { onApiAuthTokensChange, onApiForbidden } from "../../services/api/httpClient";
import type { Me } from "../../services/api/schemas";
import { readPersistedValue, removePersistedValue, writePersistedValue } from "../../services/storage/persistedValue";

const REFRESH_TOKEN_KEY = "booklistpro.refresh-token";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: Me | null;
  canWrite: boolean;
  loginError: string | null;
  forbiddenMessage: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  dismissForbidden: () => void;
};

/**
 * Expose pour permettre aux tests d'injecter un utilisateur fixe (role
 * editeur/lecteur) sans passer par le flux reseau reel (voir testProviders).
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
export type { AuthContextValue };

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Connexion impossible.";
}

/**
 * Session applicative : persiste uniquement le refreshToken (l'accessToken
 * a une duree de vie courte et n'a pas besoin de survivre a un redemarrage).
 * Au demarrage, un refreshToken present declenche un refresh silencieux
 * puis un GET /me pour reconstituer l'utilisateur courant.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<Me | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  useEffect(() => {
    onApiForbidden((error: ApiError) => setForbiddenMessage(error.message));
    return () => onApiForbidden(null);
  }, []);

  useEffect(() => {
    onApiAuthTokensChange((tokens) => {
      if (tokens?.refreshToken) {
        void writePersistedValue(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    });
    return () => onApiAuthTokensChange(null);
  }, []);

  useEffect(() => {
    let annule = false;

    async function restore() {
      const storedRefreshToken = await readPersistedValue(REFRESH_TOKEN_KEY);

      if (!storedRefreshToken) {
        if (!annule) setStatus("anonymous");
        return;
      }

      try {
        await refreshAuth(storedRefreshToken);
        const me = await getMe();
        if (!annule) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        await removePersistedValue(REFRESH_TOKEN_KEY);
        if (!annule) setStatus("anonymous");
      }
    }

    void restore();

    return () => {
      annule = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoginError(null);

    try {
      await loginRequest(payload);
      const me = await getMe();
      setUser(me);
      setStatus("authenticated");
    } catch (error) {
      setLoginError(messageFromError(error));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    void removePersistedValue(REFRESH_TOKEN_KEY);
    setUser(null);
    setLoginError(null);
    setStatus("anonymous");
  }, []);

  const dismissForbidden = useCallback(() => setForbiddenMessage(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      canWrite: user?.role === "editeur",
      loginError,
      forbiddenMessage,
      login,
      logout,
      dismissForbidden
    }),
    [status, user, loginError, forbiddenMessage, login, logout, dismissForbidden]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit etre utilise a l'interieur de AuthProvider");
  }

  return context;
}
