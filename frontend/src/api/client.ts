/**
 * HTTP-клиент к backend API.
 * Базовый URL относительный — в dev Vite проксирует /api на backend.
 * Токен авторизации подставляется из localStorage.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** Полный URL API (для fetch без api.* — например multipart загрузка файлов). */
export function buildApiUrl(path: string): string {
  const baseOrigin = API_BASE || window.location.origin;
  return new URL(path.startsWith("http") ? path : `${API_BASE}${path}`, baseOrigin).toString();
}

/** URL для <img src> к статике API (/uploads/...) при отдельном домене фронта (Render/Vercel). */
export function mediaUrl(src: string | undefined | null): string {
  if (src == null) return "";
  const s = String(src).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return buildApiUrl(path);
}

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

function parseApiErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string } | string;
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof first.msg === "string") return first.msg;
    return JSON.stringify(first);
  }
  return fallback;
}

async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...init } = config;
  const baseOrigin = API_BASE || window.location.origin;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`, baseOrigin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "Не удалось подключиться к серверу. Проверьте VITE_API_URL на frontend и CORS_ORIGINS на backend."
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: unknown }).detail;
    const message = parseApiErrorMessage(detail, res.statusText);
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(path: string, config?: RequestConfig) =>
    request<T>(path, { ...config, method: "GET" }),

  post: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>(path, { ...config, method: "POST", body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>(path, { ...config, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string, config?: RequestConfig) =>
    request<T>(path, { ...config, method: "DELETE" }),
};
