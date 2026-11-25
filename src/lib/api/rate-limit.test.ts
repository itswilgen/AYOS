import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, tooManyRequestsMessage } from './client'

/** The API answers 429 with Laravel's "Too Many Attempts." and a Retry-After header (seconds). */
function tooMany(retryAfter?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (retryAfter) headers['Retry-After'] = retryAfter
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Too Many Attempts.' }), { status: 429, headers })))
}

afterEach(() => vi.unstubAllGlobals())

describe('Hitting a rate limit', () => {
  it('tells the person how long to wait, in plain words, instead of "Too Many Attempts."', async () => {
    tooMany('42')

    const failure = await apiRequest('/providers').catch((cause: unknown) => cause)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(429)
    expect((failure as ApiError).message).toBe('Too many tries. Please wait 42 seconds, then try again.')
  })

  it('still reads well without a wait time, and for exactly one second', () => {
    expect(tooManyRequestsMessage(null)).toBe('Too many tries. Please wait a moment, then try again.')
    expect(tooManyRequestsMessage('soon')).toBe('Too many tries. Please wait a moment, then try again.')
    expect(tooManyRequestsMessage('1')).toBe('Too many tries. Please wait 1 second, then try again.')
  })
})
