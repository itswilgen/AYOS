const configuredApi = import.meta.env.VITE_API_BASE_URL as string | undefined;
const configuredBackend = import.meta.env.VITE_BACKEND_URL as
  | string
  | undefined;
const backendOrigin = (
  configuredBackend ||
  (configuredApi?.startsWith("http")
    ? new URL(configuredApi).origin
    : window.location.origin)
).replace(/\/+$/, "");
const apiBase = (configuredApi || `${backendOrigin}/api`).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function csrfToken(): string | undefined {
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="));
  return entry
    ? decodeURIComponent(entry.slice("XSRF-TOKEN=".length))
    : undefined;
}

let csrfRequest: Promise<void> | undefined;
async function ensureCsrfCookie(): Promise<void> {
  if (!csrfRequest) {
    csrfRequest = fetch(`${backendOrigin}/sanctum/csrf-cookie`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(() => undefined)
      .catch((error: unknown) => {
        csrfRequest = undefined;
        throw error;
      });
  }
  await csrfRequest;
}

function messageFrom(payload: unknown): string {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : "The request could not be completed.";
}

async function request<TResponse>(
  url: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (typeof init.body === "string" && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const token = csrfToken();
  if (
    token &&
    init.method &&
    !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase())
  )
    headers.set("X-XSRF-TOKEN", token);
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });
  const payload: unknown =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok) {
    const isServerError = response.status >= 500;
    throw new ApiError(
      isServerError
        ? "We couldn’t complete that request. Please try again."
        : messageFrom(payload),
      response.status,
      isServerError ? undefined : payload,
    );
  }
  return payload as TResponse;
}

/** Laravel Sanctum session requests. Passwords and session state never enter browser storage. */
export async function authRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const method = (init.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) await ensureCsrfCookie();
  return request<TResponse>(
    `${backendOrigin}${path.startsWith("/") ? path : `/${path}`}`,
    { ...init, method },
  );
}

/** Typed API boundary for JSON API endpoints. */
export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const method = (init.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) await ensureCsrfCookie();
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  return request<TResponse>(`${apiBase}${endpoint}`, { ...init, method });
}

export function backendUrl(path: string): string {
  return `${backendOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}
