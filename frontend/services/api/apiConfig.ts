const defaultApiBaseUrl = "http://localhost:3000";
const defaultTimeoutMs = 8000;

function lireTimeout() {
  const valeur = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : defaultTimeoutMs;
}

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiBaseUrl,
  timeoutMs: lireTimeout()
} as const;
