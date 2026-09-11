import type { z } from "zod";

import { apiConfig } from "./apiConfig";
import {
  type ApiError,
  mapHttpErrorResponse,
  mapInvalidResponse,
  mapNetworkError
} from "./apiErrors";
import { authRefreshResponseSchema } from "./schemas";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ResponseKind = "json" | "text" | "empty";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  responseKind?: ResponseKind;
  signal?: AbortSignal | undefined;
  skipAuthRefresh?: boolean;
};

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

let authTokens: AuthTokens | null = null;
let refreshRequest: Promise<string> | null = null;

/**
 * Notifie de tout changement de jetons (connexion, refresh silencieux,
 * deconnexion) pour permettre a la couche session (AuthProvider) de
 * persister le refreshToken sans que httpClient ne connaisse le storage.
 */
export type TokensListener = (tokens: Readonly<AuthTokens> | null) => void;
let tokensListener: TokensListener | null = null;

export function onApiAuthTokensChange(listener: TokensListener | null) {
  tokensListener = listener;
}

/**
 * Notifie les 403 (droits insuffisants) pour permettre un affichage global
 * clair, independant de l'ecran qui a declenche l'appel.
 */
export type ForbiddenListener = (error: ApiError) => void;
let forbiddenListener: ForbiddenListener | null = null;

export function onApiForbidden(listener: ForbiddenListener | null) {
  forbiddenListener = listener;
}

export function setApiAuthTokens(tokens: AuthTokens) {
  authTokens = tokens;
  tokensListener?.(authTokens);
}

export function clearApiAuthTokens() {
  authTokens = null;
  refreshRequest = null;
  tokensListener?.(null);
}

function buildUrl(path: `/${string}`) {
  return `${apiConfig.baseUrl.replace(/\/$/, "")}${path}`;
}

function buildHeaders(options: RequestOptions) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers
  };

  if (authTokens?.accessToken) {
    headers.Authorization = `Bearer ${authTokens.accessToken}`;
  }

  return headers;
}

async function parseBody(response: Response, responseKind: ResponseKind) {
  if (responseKind === "empty") {
    return undefined;
  }

  const texte = await response.text();
  if (responseKind === "text") {
    return texte;
  }

  if (texte.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(texte) as unknown;
  } catch {
    throw mapInvalidResponse(response.status, [
      {
        code: "custom",
        message: "JSON invalide",
        path: []
      }
    ]);
  }
}

async function send<TResponse>(
  path: `/${string}`,
  schema: z.ZodType<TResponse>,
  options: RequestOptions
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeoutId = setTimeout(abort, apiConfig.timeoutMs);

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", abort, { once: true });
  }

  const init: RequestInit = {
    headers: buildHeaders(options),
    method: options.method ?? "GET",
    signal: controller.signal
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(buildUrl(path), init);

    if (!response.ok) {
      throw await mapHttpErrorResponse(response);
    }

    const body = await parseBody(response, options.responseKind ?? "json");
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      throw mapInvalidResponse(response.status, parsed.error.issues);
    }

    return parsed.data;
  } catch (error) {
    if (isApiError(error)) {
      throw error;
    }

    throw mapNetworkError(error);
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abort);
  }
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "type" in error;
}

/**
 * N'accepte a rafraichir que le code d'erreur precis "jeton_expire" (pas
 * "jeton_invalide" ou "jeton_absent") : un jeton invalide ou absent ne
 * serait pas reparee par un refresh, autant echouer tout de suite plutot
 * que de perdre un aller-retour reseau inutile. `skipAuthRefresh` coupe la
 * boucle pour les appels internes (/auth/refresh lui-meme, login).
 */
function shouldRefresh(error: ApiError, options: RequestOptions) {
  return (
    error.type === "ErreurAuth" &&
    error.status === 401 &&
    error.code === "jeton_expire" &&
    !options.skipAuthRefresh &&
    Boolean(authTokens?.refreshToken)
  );
}

/**
 * Un seul refresh en vol a la fois (`refreshRequest` partage), meme si N
 * requetes recoivent un 401 simultanement : la premiere a echouer demarre
 * le refresh et le memorise, les suivantes trouvent `refreshRequest` deja
 * pose par `??=` et attendent la MEME promesse au lieu d'en relancer une
 * chacune. Reinitialise a `null` dans le `finally` pour que le prochain
 * jeton expire declenche un nouveau refresh plutot que de reutiliser une
 * promesse deja resolue/rejetee.
 */
async function refreshAccessToken() {
  const refreshToken = authTokens?.refreshToken;

  if (!refreshToken) {
    throw mapNetworkError(new Error("refreshToken absent"));
  }

  refreshRequest ??= send("/auth/refresh", authRefreshResponseSchema, {
    body: { refreshToken },
    method: "POST",
    skipAuthRefresh: true
  }).then((response) => {
    authTokens = { accessToken: response.accessToken, refreshToken };
    return response.accessToken;
  });

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

/**
 * Point d'entree unique pour tout appel API applicatif. Intercepte deux
 * cas transverses independamment de l'appelant :
 * - 401 "jeton_expire" -> un seul refresh silencieux (voir
 *   refreshAccessToken) puis rejoue la requete d'origine une fois
 *   (`skipAuthRefresh: true` pour ne pas boucler si le refresh lui-meme
 *   echoue et que le retry echoue encore).
 * - 403 -> notifie forbiddenListener (ecoute par AuthProvider) pour un
 *   affichage global clair, sans bloquer l'appelant qui recoit quand meme
 *   l'erreur normalement (il peut avoir sa propre gestion locale en plus).
 */
export async function apiRequest<TResponse>(
  path: `/${string}`,
  schema: z.ZodType<TResponse>,
  options: RequestOptions = {}
) {
  try {
    return await send(path, schema, options);
  } catch (error) {
    if (isApiError(error) && shouldRefresh(error, options)) {
      await refreshAccessToken();
      return send(path, schema, { ...options, skipAuthRefresh: true });
    }

    if (isApiError(error) && error.type === "ErreurAuth" && error.status === 403) {
      forbiddenListener?.(error);
    }

    throw error;
  }
}
