import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react'
import { providersService } from '../../../services/home.service'
import type { ProviderSummary, ServiceLocationSummary } from '../../../types/marketplace'
import { demoProviders } from '../demo-providers'
import { serviceSearchPath } from '../home-links'

const SHOWN = 8
/** Lowercases a trade for use mid-sentence, keeping acronyms like CCTV intact. */
const inSentence = (trade: string) => trade.split(' ').map((word) => word === word.toUpperCase() ? word : word.toLowerCase()).join(' ')

export default function ProviderShowcase({ location }: { location?: ServiceLocationSummary }) {
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [showingDemoProfiles, setShowingDemoProfiles] = useState(false)
  useEffect(() => {
    let active = true
    void providersService.getFeaturedProviders()
      .then((items) => {
        if (!active) return
        setShowingDemoProfiles(items.length === 0)
        setProviders(items.length ? items.slice(0, SHOWN) : demoProviders.slice(0, SHOWN))
      })
      .catch(() => {
        if (!active) return
        setShowingDemoProfiles(true)
        setProviders(demoProviders.slice(0, SHOWN))
      })
    return () => { active = false }
  }, [])
  if (!providers.length) return null

  return <section className="home-section" aria-labelledby="provider-showcase-title">
    <header className="home-section-head">
      <div><p className="home-kicker">Local providers</p><h2 id="provider-showcase-title" className="home-title">Meet local pros</h2></div>
      <p className="home-lede">{showingDemoProfiles
        ? <><span className="home-sample-label">Demo profiles</span> These sample businesses show how providers appear. Real providers replace them as they join.</>
        : 'Every provider here was reviewed by AYOS before taking requests.'}</p>
    </header>
    <ul className="home-pro-grid">{providers.map((provider) => <li key={provider.id}>
      <article className="home-pro">
        <div className="home-pro-photo">{provider.photo
          ? <img src={provider.photo} alt="" loading="lazy" decoding="async" />
          : <span className="home-pro-initials" aria-hidden="true">{provider.initials}</span>}</div>
        <div className="home-pro-body">
          <div className="home-pro-info">
            <p className="home-pro-trade">{provider.specialties[0]}</p>
            <h3>{provider.displayName}</h3>
            <p className="home-pro-stats">
              {provider.rating !== null
                ? <span className="home-pro-rating"><Star size={14} fill="currentColor" aria-hidden="true" /><strong>{provider.rating.toFixed(1)}</strong> ({provider.reviewCount} reviews)</span>
                : <span>New on AYOS</span>}
              {provider.completedServices > 0 && <span>{provider.completedServices} jobs done</span>}
            </p>
            {provider.verificationStatus === 'verified' && <p className="home-pro-verified"><BadgeCheck size={15} aria-hidden="true" /> Identity checked</p>}
            {provider.serviceAreaLabel && <p className="home-pro-area"><MapPin size={14} aria-hidden="true" /> {provider.serviceAreaLabel}</p>}
          </div>
          <Link
            className="home-pro-link"
            to={provider.sample ? serviceSearchPath(provider.specialties[0], location) : `/providers/${provider.id}`}
            aria-label={provider.sample ? undefined : `View ${provider.displayName}’s profile`}
          >
            {provider.sample ? `Find ${inSentence(provider.specialties[0])} pros` : 'View profile'} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </li>)}</ul>
  </section>
}
