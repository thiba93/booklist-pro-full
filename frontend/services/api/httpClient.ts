import { apiConfig } from "./apiConfig";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
};

export async function apiRequest<TResponse>(
  path: `/${string}`,
  options: RequestOptions = {}
) {
  const requestInit: RequestInit = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers
    },
    method: options.method ?? "GET"
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, requestInit);

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
