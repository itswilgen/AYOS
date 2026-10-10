const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message); this.name = 'ApiError'; this.status = status; this.details = details
  }
}

/** Laravel Sanctum ready request boundary. Keep cookies enabled for session auth. */
export async function apiRequest<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '')
  const endpoint = path.startsWith('/') ? path : `/${path}`
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers,
  })
  const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
      ? payload.message : 'The request could not be completed.'
    throw new ApiError(message, response.status, payload)
  }
  return payload as TResponse
}

// Phase 2 endpoints: POST /register, /login, /logout; GET /user. Acquire the
// Sanctum CSRF cookie before state-changing requests when the Laravel API is connected.
