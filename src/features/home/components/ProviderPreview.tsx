import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProviderSummary } from '../../../types/marketplace'

export default function ProviderPreview({ providers }: { providers: ProviderSummary[] }) {
  return <section className="home-section home-provider-section" aria-labelledby="provider-preview-title">
    <div className="home-section-heading">
      <div><span className="home-eyebrow">A LOOK AT AYOS</span><h2 id="provider-preview-title">Example provider profiles</h2><p>Sample listings show how local skills will appear once provider profiles are connected.</p></div>
      <span className="home-sample-label">SAMPLE DATA</span>
    </div>
    {providers.length ? <div className="provider-preview-list">
      {providers.map((provider) => <article className="provider-preview" key={provider.id}>
        <div className="provider-avatar" aria-hidden="true">{provider.initials}</div>
        <div className="provider-preview-main">
          <div className="provider-name-line"><h3>{provider.displayName}</h3><span className="provider-sample-pill">Example</span></div>
          <p>{provider.specialties.join(' · ')}</p>
          <span className="provider-location"><MapPin size={14} aria-hidden="true" /> {provider.serviceAreaLabel}</span>
          <div className="provider-meta">
            {provider.rating !== null && <span><Star size={14} fill="currentColor" aria-hidden="true" /> {provider.rating.toFixed(1)} <small>({provider.reviewCount} sample reviews)</small></span>}
            <span><BadgeCheck size={14} aria-hidden="true" /> {provider.verificationStatus === 'verified' ? 'Identity checked' : 'Not yet checked'}</span>
            <span className={`provider-availability is-${provider.availability}`}><i aria-hidden="true" /> {provider.availability === 'available' ? 'Available' : provider.availability === 'busy' ? 'Busy' : 'Offline'}</span>
          </div>
        </div>
        <div className="provider-preview-side"><span>{provider.completedServices} sample services</span><Link to={`/services/search?${new URLSearchParams({ service: provider.specialties[0] })}`} aria-label={`Search for ${provider.specialties[0]}`}><ArrowRight size={18} aria-hidden="true" /></Link></div>
      </article>)}
    </div> : <div className="home-inline-empty"><p>Sample provider profiles are being prepared.</p></div>}
    <p className="home-sample-disclaimer">These are illustrative profiles for Tanjay City and are not live provider listings.</p>
  </section>
}
