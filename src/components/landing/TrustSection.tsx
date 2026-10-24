import { ArrowUpRight, BadgeCheck, ClipboardCheck, LockKeyhole, MessageSquareText } from 'lucide-react'

const safeguards = [
  {
    icon: ClipboardCheck,
    title: 'Providers are reviewed first',
    text: 'Every provider application is checked by the AYOS team before a profile can receive requests.',
  },
  {
    icon: LockKeyhole,
    title: 'Your address stays private',
    text: 'Providers see only your city until they accept your request. Your exact address is shared after that.',
  },
  {
    icon: MessageSquareText,
    title: 'Reviews come from finished jobs',
    text: 'Only a customer who confirmed the completed work can leave a review, and only once per job.',
  },
  {
    icon: BadgeCheck,
    title: 'Identity checks, clearly marked',
    text: 'Providers can submit an ID for verification. Checked profiles carry an “Identity checked” badge.',
  },
]

export default function TrustSection() {
  return <section className="lp-trust" aria-labelledby="trust-title">
    <div className="lp-container lp-trust-layout">
      <div className="lp-trust-intro lp-reveal">
        <p className="lp-kicker">Good work starts with trust</p>
        <h2 id="trust-title" className="lp-title">Know who you’re <em>inviting in.</em></h2>
        <p className="lp-lede">When someone comes to your home, you deserve more than a phone number. Here’s how AYOS keeps every job accountable.</p>
        <a className="lp-trust-contact" href="mailto:hello@ayos.ph">Questions about safety? hello@ayos.ph <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
      <ul className="lp-trust-list">
        {safeguards.map(({ icon: Icon, title, text }) => <li className="lp-trust-item" key={title}>
          <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
          <div><h3>{title}</h3><p>{text}</p></div>
        </li>)}
      </ul>
    </div>
  </section>
}
