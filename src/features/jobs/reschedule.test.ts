import { describe, expect, it } from 'vitest'
import { localInput, visitTime } from './reschedule'

describe('reschedule times', () => {
  it('shows a stored UTC visit in Manila time', () => {
    expect(visitTime('2026-11-18 01:00:00')).toMatch(/^Wed, Nov 18, 9:00\sAM$/)
  })

  it('fills a datetime-local input in the viewer’s own time', () => {
    expect(localInput(new Date(2026, 10, 5, 7, 3))).toBe('2026-11-05T07:03')
    expect(localInput(new Date('2026-11-18T01:00:00Z'))).toBe('2026-11-18T09:00')
  })
})
