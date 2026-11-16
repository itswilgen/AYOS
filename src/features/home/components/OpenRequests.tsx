import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { CustomerRequest } from '../../../types/marketplace'
import { openRequests, REQUEST_STEPS } from '../request-progress'

/**
 * Every open request with its progress. Shown only when there is more than one,
 * because the hero ticket already tells the story of a single request.
 */
export default function OpenRequests({ requests }: { requests: CustomerRequest[] }) {
  const open = openRequests(requests)
  if (open.length < 2) return null

  return <section className="home-section home-open" aria-labelledby="open-title">
    <header className="home-section-head">
      <div>
        <p className="home-kicker">In progress</p>
        <h2 id="open-title" className="home-title">Your open requests</h2>
      </div>
      <Link className="home-open-all" to="/my-requests">All requests <ChevronRight size={16} aria-hidden="true" /></Link>
    </header>
    <ol className="home-open-list">
      {open.map(({ request, progress }, index) => <li key={request.id} className="home-rise" style={{ '--i': index } as CSSProperties}>
        <Link className="home-open-row" to={`/my-requests#request-${request.id}`}>
          <span className="home-open-main">
            <span className="home-open-service">{request.service}</span>
            <span className="home-open-provider">with {request.provider_name}</span>
          </span>
          <span className="home-open-progress">
            <span className="home-open-status">{progress.status}</span>
            <span className="home-open-dots" role="img" aria-label={`Step ${progress.step + 1} of ${REQUEST_STEPS.length}`}
              style={{ '--progress': progress.step / (REQUEST_STEPS.length - 1) } as CSSProperties}>
              {REQUEST_STEPS.map((label, step) => <span key={label} className={step < progress.step ? 'is-done' : step === progress.step ? 'is-current' : undefined} />)}
            </span>
          </span>
          <ChevronRight className="home-open-chevron" size={18} aria-hidden="true" />
        </Link>
      </li>)}
    </ol>
  </section>
}
