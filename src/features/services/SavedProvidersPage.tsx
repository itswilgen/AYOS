import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Bookmark, MapPin, Star } from 'lucide-react'
import { savedProvidersService } from '../../services/home.service'
import type { SavedProvider } from '../../types/marketplace'
import { fromPrice, lowestPrice } from '../../lib/format/peso'
import './saved-providers.css'

type LoadState = 'loading' | 'ready' | 'error'

/** The customer's short list of providers they trust, each one tap from a new request. */
export default function SavedProvidersPage() {
  const [items, setItems] = useState<SavedProvider[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    savedProvidersService.list()
      .then((result) => { if (active) { setItems(result); setState('ready') } })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [attempt])

  const retry = () => { setState('loading'); setAttempt((value) => value + 1) }
  const remove = async (provider: SavedProvider) => {
    setRemoving(provider.id)
    setError('')
    try {
      await savedProvidersService.remove(provider.id)
      setItems((current) => current.filter((item) => item.id !== provider.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `We couldn’t remove ${provider.displayName}. Try again.`)
    } finally {
      setRemoving(null)
    }
  }

  return <main className="app-page saved-page">
    <div className="search-results-heading">
      <span className="home-eyebrow">YOUR PROVIDERS</span>
      <h1>Saved providers</h1>
      <p>People you trust, one tap from a new request.</p>
    </div>

    {state === 'loading' && <ul className="saved-list" aria-busy="true" aria-label="Loading saved providers">{[0, 1].map((key) => <li key={key} className="saved-card is-skeleton"><span /><span /><span /></li>)}</ul>}
    {state === 'error' && <div className="app-load-error" role="alert"><p>We couldn’t load your saved providers.</p><button type="button" onClick={retry}>Try again</button></div>}
    {error && <p className="saved-error" role="alert">{error}</p>}

    {state === 'ready' && (items.length ? <ul className="saved-list">
      {items.map((provider) => {
        const price = lowestPrice(provider.startingPrices)
        return <li key={provider.id} className="saved-card">
          <div className="saved-card-who">
            {provider.photo ? <img className="saved-avatar" src={provider.photo} alt="" /> : <span className="saved-avatar" aria-hidden="true">{provider.initials}</span>}
            <div>
              <h2 className="saved-name"><Link to={`/providers/${provider.id}`}>{provider.displayName}</Link></h2>
              <p className="saved-trades">{provider.specialties.join(' · ')}</p>
            </div>
          </div>
          <ul className="saved-facts">
            {provider.rating !== null && <li><Star size={14} fill="currentColor" aria-hidden="true" /> {provider.rating.toFixed(1)} · {provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'}</li>}
            {provider.serviceAreaLabel && <li><MapPin size={14} aria-hidden="true" /> {provider.serviceAreaLabel}</li>}
            {provider.verificationStatus === 'verified' && <li><BadgeCheck size={14} aria-hidden="true" /> Identity checked</li>}
            {price !== null && <li className="saved-price">{fromPrice(price)}</li>}
          </ul>
          <div className="saved-card-foot">
            {provider.acceptingRequests
              ? <Link className="saved-request" to={`/services/request/${provider.id}`}>Request <ArrowRight size={16} aria-hidden="true" /></Link>
              : <span className="saved-paused">Not taking requests right now</span>}
            <button type="button" className="saved-remove" disabled={removing === provider.id} onClick={() => void remove(provider)}>
              {removing === provider.id ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </li>
      })}
    </ul> : <div className="saved-empty">
      <span className="saved-empty-icon" aria-hidden="true"><Bookmark size={22} /></span>
      <h2>No saved providers yet</h2>
      <p>On a provider’s profile, tap <strong>Save for later</strong>. They’ll wait here for the next time you need them.</p>
      <Link className="saved-request" to="/home#services">Browse services <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>)}
  </main>
}
