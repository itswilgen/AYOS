import type { GateSummary, GateTrend } from '../../services/admin.service'

/** "45 min", "2 h 10 min", "1 d 3 h". Minutes are whole numbers from the server. */
export function durationText(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 1) return 'Under 1 min'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours} h ${rest} min` : `${hours} h`
  }
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  return hours ? `${days} d ${hours} h` : `${days} d`
}

export const percentText = (rate: number | null) => rate === null ? '—' : `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`

/** A trend in words, so it never depends on colour alone. */
export type TrendLine = { tone: 'good' | 'bad' | 'neutral' | 'pending'; text: string }

const tones: Record<Exclude<GateTrend, null>, TrendLine['tone']> = { better: 'good', worse: 'bad', same: 'neutral' }

export function repeatTrend(gate: GateSummary): TrendLine {
  const { trend, previousRate } = gate.repeatBookings
  if (trend === null) return { tone: 'pending', text: `No trend yet: needs ${gate.minSample} requests per ${gate.days}-day period` }
  const text = { better: `Up from ${percentText(previousRate)}`, worse: `Down from ${percentText(previousRate)}`, same: 'Same as the period before' }[trend]
  return { tone: tones[trend], text }
}

export function acceptTrend(gate: GateSummary): TrendLine {
  const { trend, previousMedianMinutes } = gate.acceptSpeed
  if (trend === null) return { tone: 'pending', text: `No trend yet: needs ${gate.minSample} accepted per ${gate.days}-day period` }
  const before = durationText(previousMedianMinutes)
  const text = { better: `Faster than before (${before})`, worse: `Slower than before (${before})`, same: 'Same as the period before' }[trend]
  return { tone: tones[trend], text }
}
