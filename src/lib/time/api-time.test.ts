import { describe, expect, it } from 'vitest'
import { apiTime } from './api-time'

describe('apiTime', () => {
  it('reads database times without a zone as UTC, not local time', () => {
    // The bug this guards: "01:00" stored in UTC showed as 1 AM instead of 9 AM in Manila.
    const visit = apiTime('2026-11-18 01:00:00')
    expect(visit.toISOString()).toBe('2026-11-18T01:00:00.000Z')
    expect(visit.getHours()).toBe(9)
  })

  it('keeps times that already carry a zone', () => {
    expect(apiTime('2026-11-18T09:00:00+08:00').toISOString()).toBe('2026-11-18T01:00:00.000Z')
    expect(apiTime('2026-11-18T01:00:00Z').toISOString()).toBe('2026-11-18T01:00:00.000Z')
    expect(apiTime('2026-11-18T09:00:00+0800').toISOString()).toBe('2026-11-18T01:00:00.000Z')
  })

  it('leaves plain dates alone', () => {
    expect(apiTime('2026-11-18').toISOString()).toBe('2026-11-18T00:00:00.000Z')
  })
})
