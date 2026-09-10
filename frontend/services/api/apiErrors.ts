import type { ZodIssue } from "zod";

type ChampsErreur = Readonly<Record<string, string>>;

export type ErreurReseau = Error & {
  type: "ErreurReseau";
  timeout: boolean;
};

export type ErreurValidation = Error & {
  type: "ErreurValidation";
  status: number;
  code: string;
  champs: ChampsErreur;
};

export type ErreurConflit = Error & {
  type: "ErreurConflit";
  status: 409;
  code: string;
  serveur?: unknown;
  versionAttendue?: number;
};

export type ErreurAuth = Error & {
  type: "ErreurAuth";
  status: 401 | 403;
  code: string;
};

export type ErreurServeurIndisponible = Error & {
  type: "ErreurServeurIndisponible";
  status: number;
  code: string;
  retryable: true;
};

export type ApiError =
  | ErreurReseau
  | ErreurValidation
  | ErreurConflit
  | ErreurAuth
  | ErreurServeurIndisponible;

type ApiErrorPayload = {
  erreur: string;
  message: string;
  champs: ChampsErreur;
  serveur?: unknown;
  versionAttendue?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readChamps(value: unknown): ChampsErreur {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      return typeof entry[1] === "string";
    })
  );
}

function readPayload(body: unknown, fallbackMessage: string): ApiErrorPayload {
  if (!isRecord(body)) {
    return { erreur: "erreur_api", message: fallbackMessage, champs: {} };
  }

  const payload: ApiErrorPayload = {
    erreur: readString(body, "erreur", "erreur_api"),
    message: readString(body, "message", fallbackMessage),
    champs: readChamps(body.champs)
  };

  if ("serveur" in body) {
    payload.serveur = body.serveur;
  }

  if (typeof body.versionAttendue === "number") {
    payload.versionAttendue = body.versionAttendue;
  }

  return payload;
}

function creerErreurReseau(message: string, timeout: boolean): ErreurReseau {
  const error = new Error(message) as ErreurReseau;
  error.type = "ErreurReseau";
  error.timeout = timeout;
  return error;
}

function creerErreurValidation(
  status: number,
  code: string,
  message: string,
  champs: ChampsErreur
): ErreurValidation {
  const error = new Error(message) as ErreurValidation;
  error.type = "ErreurValidation";
  error.status = status;
  error.code = code;
  error.champs = champs;
  return error;
}

function creerErreurConflit(payload: ApiErrorPayload): ErreurConflit {
  const error = new Error(payload.message) as ErreurConflit;
  error.type = "ErreurConflit";
  error.status = 409;
  error.code = payload.erreur;

  if ("serveur" in payload) {
    error.serveur = payload.serveur;
  }

  if (typeof payload.versionAttendue === "number") {
    error.versionAttendue = payload.versionAttendue;
  }

  return error;
}

function creerErreurAuth(status: 401 | 403, payload: ApiErrorPayload): ErreurAuth {
  const error = new Error(payload.message) as ErreurAuth;
  error.type = "ErreurAuth";
  error.status = status;
  error.code = payload.erreur;
  return error;
}

function creerErreurIndisponible(status: number, payload: ApiErrorPayload) {
  const error = new Error(payload.message) as ErreurServeurIndisponible;
  error.type = "ErreurServeurIndisponible";
  error.status = status;
  error.code = payload.erreur;
  error.retryable = true;
  return error;
}

export function mapApiError(status: number, body: unknown, statusText = "Erreur API") {
  const payload = readPayload(body, statusText);

  if (status === 401 || status === 403) {
    return creerErreurAuth(status, payload);
  }

  if (status === 409) {
    return creerErreurConflit(payload);
  }

  if (status === 503 || status >= 500) {
    return creerErreurIndisponible(status, payload);
  }

  return creerErreurValidation(status, payload.erreur, payload.message, payload.champs);
}

export async function mapHttpErrorResponse(response: Response) {
  const texte = await response.text();
  let body: unknown = null;

  if (texte.length > 0) {
    try {
      body = JSON.parse(texte);
    } catch {
      body = texte;
    }
  }

  return mapApiError(response.status, body, response.statusText);
}

export function mapNetworkError(error: unknown) {
  const isDomAbort =
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError";
  const timeout =
    isDomAbort || (isRecord(error) && error.name === "AbortError");

  return creerErreurReseau(
    timeout ? "Delai d'appel API depasse." : "Impossible de joindre l'API.",
    timeout
  );
}

export function mapInvalidResponse(status: number, issues: readonly ZodIssue[]) {
  const champs = Object.fromEntries(
    issues.map((issue) => {
      const firstPath = issue.path[0];
      const key =
        typeof firstPath === "string" || typeof firstPath === "number"
          ? String(firstPath)
          : "reponse";
      return [key, issue.message];
    })
  );

  return creerErreurValidation(
    status,
    "reponse_invalide",
    "La reponse API ne respecte pas le contrat attendu.",
    champs
  );
}
