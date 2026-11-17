import { describe, expect, it } from 'vitest'
import type { GateSummary } from '../../services/admin.service'
import { acceptTrend, durationText, percentText, repeatTrend } from './gate-format'

const gate = (overrides: { repeat?: Partial<GateSummary['repeatBookings']>; accept?: Partial<GateSummary['acceptSpeed']> } = {}): GateSummary => ({
  days: 30, minSample: 5,
  repeatBookings: { requests: 5, repeats: 2, rate: 40, previousRate: 12.5, trend: 'better', ...overrides.repeat },
  acceptSpeed: { accepted: 5, medianMinutes: 45, previousMedianMinutes: 130, waiting: 0, trend: 'better', ...overrides.accept },
})

describe('gate card wording', () => {
  it('writes durations the way people say them', () => {
    expect(durationText(null)).toBe('—')
    expect(durationText(0)).toBe('Under 1 min')
    expect(durationText(45)).toBe('45 min')
    expect(durationText(120)).toBe('2 h')
    expect(durationText(130)).toBe('2 h 10 min')
    expect(durationText(1500)).toBe('1 d 1 h')
    expect(durationText(2880)).toBe('2 d')
  })

  it('writes rates without needless decimals', () => {
    expect(percentText(40)).toBe('40%')
    expect(percentText(12.5)).toBe('12.5%')
    expect(percentText(null)).toBe('—')
  })

  it('says which way each number moved, in words', () => {
    expect(repeatTrend(gate())).toEqual({ tone: 'good', text: 'Up from 12.5%' })
    expect(repeatTrend(gate({ repeat: { trend: 'worse' } }))).toEqual({ tone: 'bad', text: 'Down from 12.5%' })
    // Faster acceptance is good, even though the number went down.
    expect(acceptTrend(gate())).toEqual({ tone: 'good', text: 'Faster than before (2 h 10 min)' })
    expect(acceptTrend(gate({ accept: { trend: 'worse' } }))).toEqual({ tone: 'bad', text: 'Slower than before (2 h 10 min)' })
    expect(acceptTrend(gate({ accept: { trend: 'same' } }))).toEqual({ tone: 'neutral', text: 'Same as the period before' })
  })

  it('refuses to claim a trend from too little data', () => {
    expect(repeatTrend(gate({ repeat: { trend: null } }))).toEqual({ tone: 'pending', text: 'No trend yet: needs 5 requests per 30-day period' })
    expect(acceptTrend(gate({ accept: { trend: null } })).tone).toBe('pending')
  })
})
