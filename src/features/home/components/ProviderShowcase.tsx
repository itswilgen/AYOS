import { useEffect, useState } from 'react'
import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { providersService } from '../../../services/home.service'
import type { ProviderSummary } from '../../../types/marketplace'
import { demoProviders } from '../demo-providers'

export default function ProviderShowcase() {
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [showingDemoProfiles, setShowingDemoProfiles] = useState(false)
  useEffect(() => {
    let active = true
    void providersService.getFeaturedProviders()
      .then((items) => {
        if (!active) return
        setShowingDemoProfiles(items.length === 0)
        setProviders(items.length ? items.slice(0, 10) : demoProviders)
      })
      .catch(() => {
        if (!active) return
        setShowingDemoProfiles(true)
        setProviders(demoProviders)
      })
    return () => { active = false }
  }, [])
  if (!providers.length) return null
  return <section className="home-provider-showcase" aria-labelledby="provider-showcase-title">
    <div className="home-provider-showcase-heading"><div><span className="home-eyebrow">LOCAL SKILLS, READY TO HELP</span><h2 id="provider-showcase-title">Meet local service pros</h2><p>{showingDemoProfiles ? 'Preview sample profiles across popular home services.' : 'Explore providers offering services on AYOS.'}</p></div>{showingDemoProfiles && <span className="home-sample-label">DEMO PROFILES</span>}</div>
    <div className="home-provider-card-grid">{providers.map((provider) => <article className="home-provider-card" key={provider.id}>
      <div className="home-provider-card-image">{provider.photo ? <img src={provider.photo} alt={provider.displayName} loading="lazy" /> : <span className="provider-avatar" aria-hidden="true">{provider.initials}</span>}</div>
      <div className="home-provider-card-content"><span className="home-provider-card-service">{provider.specialties[0]}</span><h3>{provider.displayName}</h3><p>{provider.specialties.join(' · ')}</p><div className="home-provider-card-meta"><span><MapPin size={14} aria-hidden={true} />{provider.serviceAreaLabel}</span>{provider.rating !== null && <span><Star size={14} fill="currentColor" aria-hidden={true} />{provider.rating.toFixed(1)} <small>({provider.reviewCount})</small></span>}</div><Link to={provider.sample ? `/services/search?${new URLSearchParams({ service: provider.specialties[0] })}` : `/services/request/${provider.id}`} className="home-provider-card-link">{provider.sample ? 'Explore service' : 'Request service'} <ArrowUpRight size={16} aria-hidden={true} /></Link></div>
    </article>)}</div>
    {showingDemoProfiles && <p className="home-provider-showcase-note">These are fictional demo profiles for preview only. Live providers will appear here when available.</p>}
  </section>
}
