import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react'
import type { ProviderSummary } from '../../types/marketplace'
import { lowestPrice, peso } from '../../lib/format/peso'
import SaveProviderButton from './SaveProviderButton'
import './search-card.css'

/** The matched service's price; the lowest one only when no service matched. Never another service's price. */
function priceFor(provider: ProviderSummary): number | null {
  return provider.matchedService ? provider.startingPrices[provider.matchedService] ?? null : lowestPrice(provider.startingPrices)
}

/** What the card leads with: the provider's approved cover, else their photo, else their initials. */
function Media({ provider }: { provider: ProviderSummary }) {
  const { cover } = provider
  if (cover) {
    return <span className={`search-card-media is-${cover.fit}`}>
      {cover.fit === 'contain' && <img className="search-card-backdrop" src={cover.image} alt="" loading="lazy" decoding="async" />}
      <img className="search-card-image" src={cover.image} alt="" loading="lazy" decoding="async"
        style={{ objectPosition: `${cover.focusX}% ${cover.focusY}%` }} />
    </span>
  }
  if (provider.photo) {
    return <span className="search-card-media is-photo"><img className="search-card-image" src={provider.photo} alt="" loading="lazy" decoding="async" /></span>
  }
  return <span className="search-card-media is-initials"><span>{provider.initials}</span></span>
}

/** One provider in search results: their work photo first, then who they are, the price and proof of good work. */
export default function SearchProviderCard({ provider }: { provider: ProviderSummary }) {
  const price = priceFor(provider)
  const profilePath = `/providers/${provider.id}`

  return <article className="search-provider-item has-media">
    <SaveProviderButton variant="icon" providerId={provider.id} providerName={provider.displayName} saved={provider.saved} />
    {/* A bigger tap target for the same profile link below, so it is hidden from keyboards and screen readers. */}
    <Link className="search-card-media-link" to={profilePath} tabIndex={-1} aria-hidden="true"><Media provider={provider} /></Link>
    <div className="search-provider-main">
      <h3>{provider.displayName}</h3>
      <p>{provider.specialties.map((name, index) => <Fragment key={name}>
        {index > 0 && ' · '}
        {name === provider.matchedService ? <strong className="search-card-match">{name}</strong> : name}
      </Fragment>)}</p>
      <span className="provider-location"><MapPin size={14} aria-hidden="true" /> {provider.serviceAreaLabel}</span>
      <div className="provider-meta">
        {price !== null && <span className="search-price">From <strong>{peso(price)}</strong></span>}
        {provider.rating !== null && <span><Star size={14} fill="currentColor" aria-hidden="true" /> {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)</span>}
        <span><BadgeCheck size={14} aria-hidden="true" /> {provider.verificationStatus === 'verified' ? 'Identity checked' : 'Not yet checked'}</span>
      </div>
      <Link className="provider-text-link" to={profilePath}>View profile and message <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </article>
}
