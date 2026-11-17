import { vi } from 'vitest'

/** One request a page sent, as the fake server saw it. */
export type FakeCall = { method: string; path: string; query: URLSearchParams; body: unknown; headers: Headers }

type Reply = { status?: number; body?: unknown }
type Responder = Reply | ((call: FakeCall) => Reply)

/**
 * A stand-in for the Laravel API at the network level (`fetch`), so flow tests run the real pages, services and
 * API client. Routes are "METHOD /path" (the path without host or query). Anything without a route answers 404,
 * and `calls` records every request so a test can check exactly what a page sent.
 */
export function fakeServer(routes: Record<string, Responder>) {
  const calls: FakeCall[] = []

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), window.location.origin)
    const method = (init.method ?? 'GET').toUpperCase()
    const call: FakeCall = { method, path: url.pathname, query: url.searchParams, body: readBody(init.body), headers: new Headers(init.headers) }
    calls.push(call)

    // Sanctum hands out the CSRF cookie; the API client then sends it back as X-XSRF-TOKEN.
    if (call.path === '/sanctum/csrf-cookie') {
      document.cookie = 'XSRF-TOKEN=test-xsrf'
      return new Response(null, { status: 204 })
    }
    const route = routes[`${method} ${call.path}`]
    const reply = typeof route === 'function' ? route(call) : route ?? { status: 404, body: { message: `No fake route for ${method} ${call.path}` } }
    const status = reply.status ?? 200
    return status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(reply.body ?? {}), { status, headers: { 'Content-Type': 'application/json' } })
  }))

  return {
    calls,
    /** Every request sent to one route, in order. */
    sent: (method: string, path: string) => calls.filter((call) => call.method === method && call.path === path),
  }
}

function readBody(body: BodyInit | null | undefined): unknown {
  if (typeof body === 'string') return body ? JSON.parse(body) : undefined
  if (body instanceof FormData) return Object.fromEntries(body.entries())
  return body ?? undefined
}
