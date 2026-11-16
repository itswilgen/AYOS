import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import type { CustomerRequest } from '../../../types/marketplace'
import { bookAgainPath, pastProviders } from '../request-progress'
import { initials, monthYear } from '../../services/profile-format'

/**
 * Providers who already finished a job for this customer, each one tap from a new request.
 * Shows your own rating when you left one: the strongest reason to book someone again.
 */
export default function BookAgain({ requests }: { requests: CustomerRequest[] }) {
  const providers = pastProviders(requests)
  if (!providers.length) return null

  return <section className="home-section home-again" aria-labelledby="again-title">
    <header className="home-section-head">
      <div>
        <p className="home-kicker">Your providers</p>
        <h2 id="again-title" className="home-title">Book again</h2>
      </div>
      <p className="home-lede">People who already did good work for you. One tap starts a new request.</p>
    </header>
    <ul className="home-again-list">
      {providers.map((provider, index) => <li key={provider.providerId} className="home-again-card home-rise" style={{ '--i': index } as CSSProperties}>
        <div className="home-again-who">
          <span className="home-again-avatar" aria-hidden="true">{initials(provider.name)}</span>
          <div>
            <h3 className="home-again-name"><Link to={`/providers/${provider.providerId}`}>{provider.name}</Link></h3>
            <p className="home-again-meta">{provider.service}{provider.lastDone ? ` · ${monthYear(provider.lastDone)}` : ''}</p>
          </div>
        </div>
        {provider.rating !== null && <p className="home-again-rating">
          <Star size={14} fill="currentColor" aria-hidden="true" /> You gave {provider.rating} of 5
        </p>}
        <Link className="home-again-action" to={bookAgainPath(provider)} aria-label={`Request ${provider.name} again for ${provider.service}`}>
          Request again <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </li>)}
    </ul>
  </section>
}
