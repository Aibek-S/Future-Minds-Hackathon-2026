/**
 * Single HTTP entry point for the ZERTTE frontend.
 * No component calls fetch() directly.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/v1";

const ACCESS_KEY = "zertte.accessToken";
const REFRESH_KEY = "zertte.refreshToken";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const tokenStore = {
  get access(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(accessToken: string, refreshToken?: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export function apiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authHeaders(): Record<string, string> {
  const token = tokenStore.access;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip the automatic refresh retry (used by the refresh call itself). */
  raw?: boolean;
  signal?: AbortSignal;
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Request failed";
  let details: unknown;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, code, message, details);
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken: string };
  tokenStore.set(data.accessToken, refreshToken);
  return true;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, raw, signal } = options;

  const send = () =>
    fetch(apiUrl(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      ...(signal ? { signal } : {}),
    });

  let res = await send();

  if (res.status === 401 && !raw) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await send();
    } else {
      tokenStore.clear();
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, signal ? { signal } : {}),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
