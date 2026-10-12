import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2 } from 'lucide-react'

export default function ProviderApplyPage() {
  return <div className="app-page provider-info-page">
    <Link className="account-back-link" to="/home"><ArrowLeft size={16} aria-hidden="true" /> Back to AYOS home</Link>
    <section className="provider-info-panel">
      <span className="provider-info-icon"><BriefcaseBusiness size={24} aria-hidden="true" /></span>
      <span className="home-eyebrow">FOR SKILLED LOCALS</span>
      <h1>Bring your work to AYOS.</h1>
      <p>Provider applications aren’t open yet. We’re preparing a clear process for local service professionals to describe their skills, service area and availability.</p>
      <ul><li><CheckCircle2 size={18} aria-hidden="true" /> Keep your AYOS account and contact details up to date</li><li><CheckCircle2 size={18} aria-hidden="true" /> Save the areas where you plan to offer service</li><li><CheckCircle2 size={18} aria-hidden="true" /> Provider access will be reviewed separately when applications open</li></ul>
      <div className="provider-info-actions"><Link className="button button-primary" to="/account/profile">Review your profile <ArrowRight size={16} aria-hidden="true" /></Link><Link className="provider-info-secondary" to="/account/locations">Manage service areas</Link></div>
    </section>
  </div>
}
