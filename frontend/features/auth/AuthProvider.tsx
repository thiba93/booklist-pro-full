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

  // httpClient ne connait pas AuthProvider (couplage a sens unique voulu,
  // voir ADR 0001) : il expose un simple callback global pour signaler un
  // 403, que ce Provider ecoute ici pour afficher un message clair quel
  // que soit l'ecran a l'origine de l'appel (voir ForbiddenBanner).
  useEffect(() => {
    onApiForbidden((error: ApiError) => setForbiddenMessage(error.message));
    return () => onApiForbidden(null);
  }, []);

  // Meme principe pour les jetons : httpClient notifie tout changement
  // (login, refresh silencieux suite a un 401) sans savoir OU le
  // refreshToken doit etre persiste. On ne persiste jamais l'accessToken
  // (duree de vie trop courte pour valoir la peine, voir doc de la
  // fonction ci-dessous) : la reconnexion au demarrage repart toujours
  // d'un refresh.
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

  // loginRequest (POST /auth/login) place deja les jetons dans httpClient
  // et declenche donc, via l'effet ci-dessus, la persistance du
  // refreshToken. On enchaine avec GET /me pour recuperer le role - le
  // login seul ne renvoie pas authRequise, necessaire pour meSchema.
  const login = useCallback(async (payload: LoginPayload) => {
    setLoginError(null);

    try {
      await loginRequest(payload);
      const me = await getMe();
      setUser(me);
      setStatus("authenticated");
    } catch (error) {
      // Rethrow : LoginScreen affiche deja loginError, mais a aussi besoin
      // de savoir que l'appel a echoue (pour arreter son propre spinner
      // local) sans dupliquer la logique d'extraction du message ici.
      setLoginError(messageFromError(error));
      throw error;
    }
  }, []);

  // logoutRequest est synchrone (efface juste les jetons en memoire, voir
  // httpClient.clearApiAuthTokens) : aucune requete serveur n'existe pour
  // invalider un refreshToken cote API, la deconnexion est donc purement
  // locale.
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
      // Liste blanche explicite (=== "editeur") plutot que !== "lecteur" :
      // un role inconnu/futur reste sans droit d'ecriture par defaut. Ceci
      // ne fait que masquer l'UI - le serveur revalide chaque ecriture
      // (403 si le role n'a pas les droits), voir ForbiddenBanner.
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
