const defaultApiBaseUrl = "http://localhost:3000";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiBaseUrl
} as const;
