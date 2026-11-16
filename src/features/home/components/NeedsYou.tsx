import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, MessageCircle, Star, type LucideIcon } from 'lucide-react'
import type { NeedsYouItem, NeedsYouKind } from '../request-progress'

const icons: Record<NeedsYouKind, LucideIcon> = { confirm: CheckCircle2, message: MessageCircle, review: Star }

/**
 * "Needs you": every to-do waiting on the customer, as tear-off stubs of the request ticket.
 * Renders nothing when there is nothing to do, so Home stays calm.
 */
export default function NeedsYou({ items }: { items: NeedsYouItem[] }) {
  if (!items.length) return null

  return <section className="home-section home-needs" aria-labelledby="needs-title">
    <header className="home-section-head">
      <div>
        <p className="home-kicker">Your to-do</p>
        <h2 id="needs-title" className="home-title">Needs you <span className="home-needs-count">{items.length}</span></h2>
      </div>
      <p className="home-lede">A quick tap on each keeps your jobs and providers moving.</p>
    </header>
    <ul className="home-needs-list">
      {items.map((item, index) => {
        const Icon = icons[item.kind]
        return <li key={item.key} className={`home-needs-item is-${item.kind} home-rise`} style={{ '--i': index } as CSSProperties}>
          <div className="home-needs-body">
            <span className="home-needs-icon" aria-hidden="true"><Icon size={20} /></span>
            <div>
              <p className="home-needs-label">{item.label}</p>
              <h3 className="home-needs-title">{item.title}</h3>
              <p className="home-needs-detail">{item.detail}</p>
            </div>
          </div>
          <Link className={`home-needs-action${item.kind === 'confirm' ? ' is-primary' : ''}`} to={item.href}>
            {item.action} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </li>
      })}
    </ul>
  </section>
}
