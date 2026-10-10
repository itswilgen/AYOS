import { BadgeCheck, ClipboardList, MessageSquareText, MapPinned } from 'lucide-react'
const trustFeatures = [
  { icon: ClipboardList, title: 'Profiles with the details', text: 'Profiles will show the services a provider offers and examples of their work.' },
  { icon: MapPinned, title: 'Service areas that make sense', text: 'Compare declared coverage for your barangay, city, or municipality.' },
  { icon: MessageSquareText, title: 'Community feedback', text: 'Customer ratings and reviews will help you make an informed choice.' },
  { icon: BadgeCheck, title: 'Clear identity information', text: 'AYOS is designed to make provider identity and profile details easier to understand.' },
]
export default function TrustSection() {
  return <section className="trust-section"><div className="container trust-layout"><div className="trust-intro"><span className="eyebrow">Good work starts with trust</span><h2>Know who you’re inviting in.</h2><p>When someone comes to your home or workplace, you deserve useful information before you reach out.</p><a href="/#how-it-works" className="inline-link">See how AYOS works <span>↗</span></a></div><div className="trust-list">{trustFeatures.map(({ icon: Icon, title, text }, i) => <article className="trust-item" key={title}><span className={`trust-icon trust-icon-${i}`}><Icon size={19} strokeWidth={1.8} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div><div className="container trust-footnote"><span className="trust-rule" />We’re building a marketplace where provider information and customer experiences can help you decide with confidence.</div></section>
}
