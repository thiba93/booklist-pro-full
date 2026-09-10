import { apiRequest, clearApiAuthTokens, setApiAuthTokens } from "./httpClient";
import {
  authRefreshResponseSchema,
  loginResponseSchema,
  meSchema,
  type LoginResponse,
  type Me,
  type RefreshResponse
} from "./schemas";

export type LoginPayload = {
  email: string;
  motDePasse: string;
};

export function logout() {
  clearApiAuthTokens();
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiRequest("/auth/login", loginResponseSchema, {
    body: payload,
    method: "POST",
    skipAuthRefresh: true
  });

  setApiAuthTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken
  });

  return response;
}

export async function refreshAuth(refreshToken: string): Promise<RefreshResponse> {
  const response = await apiRequest("/auth/refresh", authRefreshResponseSchema, {
    body: { refreshToken },
    method: "POST",
    skipAuthRefresh: true
  });

  setApiAuthTokens({ accessToken: response.accessToken, refreshToken });
  return response;
}

export function getMe(): Promise<Me> {
  return apiRequest("/me", meSchema);
}
