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

function shouldRefresh(error: ApiError, options: RequestOptions) {
  return (
    error.type === "ErreurAuth" &&
    error.status === 401 &&
    error.code === "jeton_expire" &&
    !options.skipAuthRefresh &&
    Boolean(authTokens?.refreshToken)
  );
}

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
