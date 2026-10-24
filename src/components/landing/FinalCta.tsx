import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import { serviceSearchPath } from './landing-links'

export default function FinalCta() {
  return <section className="lp-cta" aria-labelledby="cta-title">
    <div className="lp-container lp-cta-inner lp-reveal">
      <div>
        <p className="lp-kicker">Let’s get it sorted</p>
        <h2 id="cta-title" className="lp-cta-title">Something needs fixing?<br /> <em>AYOS can help.</em></h2>
      </div>
      <div className="lp-cta-side">
        <p>Tell us what’s wrong and find a local pro who covers your area.</p>
        <div className="lp-cta-actions">
          <Button href={serviceSearchPath()}>Find a service <ArrowRight size={17} aria-hidden="true" /></Button>
          <Button href="/signup" variant="text">Create a free account <ArrowRight size={16} aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  </section>
}
