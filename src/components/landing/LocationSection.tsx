import { ArrowRight, Check, MapPin, MapPinned, Wrench } from 'lucide-react'
import Button from '../ui/Button'

const coverage = [
  'Search from your saved home, office, or family address',
  'Providers list the cities and barangays they cover',
  'Built on official Philippine location data (PSGC)',
]

export default function LocationSection() {
  return <section className="lp-section lp-coverage" aria-labelledby="coverage-title">
    <div className="lp-container lp-coverage-layout">
      <div className="lp-coverage-copy lp-reveal">
        <p className="lp-kicker">Closer is more useful</p>
        <h2 id="coverage-title" className="lp-title">Find help that serves <em>your area.</em></h2>
        <p className="lp-lede">The people you find on AYOS are the people who can actually come to you, because every provider declares where they work.</p>
        <ul className="lp-checklist">
          {coverage.map((item) => <li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}
        </ul>
        <Button href="/signup" variant="secondary">Get started <ArrowRight size={16} aria-hidden="true" /></Button>
      </div>

      <figure className="lp-map">
        <img src="/images/tanjay-map-clean.webp" alt="Street map of Tanjay City, Negros Oriental" width="2041" height="771" loading="lazy" decoding="async" />
        <span className="lp-map-ring" aria-hidden="true" />
        <div className="lp-map-pin"><div className="lp-map-pin-card"><MapPin size={16} fill="currentColor" aria-hidden="true" /><span>Tanjay City<small>Example location</small></span></div></div>
        <div className="lp-map-chip lp-map-chip-a"><span className="lp-map-chip-icon"><Wrench size={15} aria-hidden="true" /></span><span>Electricians<small>Service category</small></span></div>
        <div className="lp-map-chip lp-map-chip-b"><span className="lp-map-chip-icon"><MapPinned size={15} aria-hidden="true" /></span><span>Local providers<small>Declared service areas</small></span></div>
        <figcaption>Illustration</figcaption>
      </figure>
    </div>
  </section>
}
