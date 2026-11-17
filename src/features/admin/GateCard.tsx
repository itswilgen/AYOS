import { Hourglass, Minus, Repeat, Timer, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { GateSummary } from '../../services/admin.service'
import { Panel } from './AdminUI'
import { acceptTrend, durationText, percentText, repeatTrend, type TrendLine } from './gate-format'

const trendIcons: Record<TrendLine['tone'], LucideIcon> = { good: TrendingUp, bad: TrendingDown, neutral: Minus, pending: Hourglass }

function Trend({ line, flip = false }: { line: TrendLine; flip?: boolean }) {
  // For speed, "good" means the time went down, so the arrow follows the number, not the mood.
  const Icon = flip && line.tone === 'good' ? TrendingDown : flip && line.tone === 'bad' ? TrendingUp : trendIcons[line.tone]
  return <p className={`admin-gate-trend is-${line.tone}`}><Icon size={15} aria-hidden="true" />{line.text}</p>
}

/**
 * The two numbers AYOS is judged by: do customers come back to the same provider, and how fast do providers
 * accept. Last 30 days against the 30 days before; with too little data it says so instead of guessing.
 */
export default function GateCard({ gate }: { gate: GateSummary }) {
  const { repeatBookings: repeat, acceptSpeed: accept } = gate

  return <Panel title={`Engagement · last ${gate.days} days`} action={<span className="admin-gate-note">Compared with the {gate.days} days before</span>}>
    <div className="admin-gate-grid">
      <article className="admin-gate-stat" aria-labelledby="gate-repeat">
        <header><span className="admin-metric-icon" aria-hidden="true"><Repeat size={19} /></span><h3 id="gate-repeat">Repeat bookings</h3></header>
        <strong className={repeat.rate ? undefined : 'is-zero'}>{percentText(repeat.rate)}</strong>
        <p>{repeat.requests
          ? `${repeat.repeats} of ${repeat.requests} ${repeat.requests === 1 ? 'request' : 'requests'} booked the same provider again`
          : `No requests in the last ${gate.days} days`}</p>
        <Trend line={repeatTrend(gate)} />
      </article>
      <article className="admin-gate-stat" aria-labelledby="gate-accept">
        <header><span className="admin-metric-icon" aria-hidden="true"><Timer size={19} /></span><h3 id="gate-accept">Time to accept</h3></header>
        <strong className={accept.medianMinutes === null ? 'is-zero' : undefined}>{durationText(accept.medianMinutes)}</strong>
        <p>{accept.accepted
          ? `Median of ${accept.accepted} accepted ${accept.accepted === 1 ? 'request' : 'requests'}, from sent to accepted`
          : `No requests accepted in the last ${gate.days} days`}</p>
        <Trend line={acceptTrend(gate)} flip />
        <p className={`admin-gate-waiting${accept.waiting ? ' has-waiting' : ''}`}>
          {accept.waiting ? `${accept.waiting} ${accept.waiting === 1 ? 'request is' : 'requests are'} still waiting for a reply` : 'No requests waiting for a reply'}
        </p>
      </article>
    </div>
  </Panel>
}
