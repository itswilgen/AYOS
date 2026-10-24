import { ArrowUpRight, CircleCheck } from 'lucide-react'
import Button from '../ui/Button'

const providerTools = [
  'Choose the barangays you serve',
  'Accept or decline each request',
  'Schedule and track every job',
  'Show your work and reviews',
]

export default function ProviderSection() {
  return <section id="providers" className="lp-section lp-providers" aria-labelledby="providers-title">
    <div className="lp-container lp-providers-layout">
      <div className="lp-providers-panel">
        <img src="/images/provider-electrician.webp" alt="Smiling electrician wearing safety gear and holding insulated tools" width="1024" height="1536" loading="lazy" decoding="async" />
      </div>
      <div className="lp-providers-copy lp-reveal">
        <p className="lp-kicker">For local service professionals</p>
        <h2 id="providers-title" className="lp-title">Turn your skills into <em>more opportunities.</em></h2>
        <p className="lp-lede">Build a professional profile, choose where you work, and get requests from people who need what you do well.</p>
        <ul className="lp-checklist lp-checklist-grid">
          {providerTools.map((item) => <li key={item}><CircleCheck size={18} aria-hidden="true" />{item}</li>)}
        </ul>
        <Button href="/signup" variant="secondary">Create your AYOS account <ArrowUpRight size={16} aria-hidden="true" /></Button>
        <small className="lp-providers-note">Everyone starts with one AYOS account. Once your email is verified, you can apply as a provider from it.</small>
      </div>
    </div>
  </section>
}
