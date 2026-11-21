import { BadgeCheck, HandCoins, LockKeyhole } from 'lucide-react'

const facts = [
  { icon: BadgeCheck, title: 'Reviewed providers', detail: 'Checked before taking requests' },
  { icon: HandCoins, title: 'No booking fees', detail: 'Agree on the price directly' },
  { icon: LockKeyhole, title: 'Private contact', detail: 'Hidden until you book' },
]

/** "Why AYOS" at a glance: three plain facts in a strip right under the hero, before Find services. */
export default function TrustStrip() {
  return <section className="lp-facts" aria-label="Why use AYOS">
    <ul className="lp-container lp-facts-list">
      {facts.map(({ icon: Icon, title, detail }) => <li key={title} className="lp-fact">
        <span className="lp-fact-icon" aria-hidden="true"><Icon size={19} /></span>
        <span><strong>{title}</strong>{detail}</span>
      </li>)}
    </ul>
  </section>
}
