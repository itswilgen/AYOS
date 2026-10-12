import { ArrowRight, ClipboardList, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ServiceRequestSummary } from '../../../types/marketplace'

export default function RequestActivity({ requests }: { requests: ServiceRequestSummary[] }) {
  return <section className="home-section home-request-section" id="requests" aria-labelledby="requests-title">
    <div className="home-section-heading"><div><span className="home-eyebrow">YOUR SERVICE ACTIVITY</span><h2 id="requests-title">My requests</h2></div><span className="home-coming-soon">Request tracking coming soon</span></div>
    {requests.length ? <div className="home-request-list">{requests.map((request) => <article className="home-request-row" key={request.id}>
      <span className="home-request-icon"><ClipboardList size={20} aria-hidden="true" /></span>
      <div><strong>{request.serviceName}</strong><span>{request.status} · {request.locationLabel}</span></div>
      <small>{request.updatedAtLabel}</small>
      <ArrowRight size={17} aria-hidden="true" />
    </article>)}</div> : <div className="home-request-empty">
      <span className="home-request-empty-icon"><ClipboardList size={22} aria-hidden="true" /></span>
      <div><strong>No service requests yet</strong><p>When you request a service, you’ll be able to follow updates here.</p></div>
      <Link to="/home#service-search"><Search size={16} aria-hidden="true" /> Find a service</Link>
    </div>}
  </section>
}
