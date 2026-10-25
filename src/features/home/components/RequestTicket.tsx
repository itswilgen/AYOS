import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, RotateCw } from 'lucide-react'
import Button from '../../../components/ui/Button'
import type { CustomerRequest } from '../../../types/marketplace'
import { openRequests, REQUEST_STEPS } from '../request-progress'

type Props = {
  requests: CustomerRequest[]
  state: 'loading' | 'ready' | 'error'
  onRetry: () => void
}

const preferredTime = new Intl.DateTimeFormat('en-PH', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function Ticket({ head, foot, children, label }: { head: ReactNode; foot: ReactNode; children: ReactNode; label?: string }) {
  return <article className="home-ticket" aria-label={label} aria-labelledby={label ? undefined : 'ticket-title'}>
    <div className="home-ticket-body">
      <div className="home-ticket-head">{head}</div>
      {children}
    </div>
    <div className="home-ticket-foot">{foot}</div>
  </article>
}

function Rail({ step }: { step: number }) {
  return <ol className="home-ticket-rail" aria-label="Request progress" style={{ '--progress': Math.max(step, 0) / (REQUEST_STEPS.length - 1) } as CSSProperties}>
    {REQUEST_STEPS.map((label, index) => <li key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : undefined} aria-current={index === step ? 'step' : undefined}>
      <span className="home-ticket-node" aria-hidden="true" />
      <span className="home-ticket-label">{label}</span>
    </li>)}
  </ol>
}

/** The customer's most pressing request as a work-order ticket, the same object the landing page introduces. */
export default function RequestTicket({ requests, state, onRetry }: Props) {
  if (state === 'loading') {
    return <Ticket label="Your requests" head={<span>Your requests</span>} foot={<span className="home-skeleton" style={{ width: '40%' }} />}>
      <div className="home-ticket-loading" role="status">
        <span className="sr-only">Loading your requests…</span>
        <span className="home-skeleton home-skeleton-title" />
        <span className="home-skeleton" style={{ width: '60%' }} />
        <span className="home-skeleton" style={{ width: '85%' }} />
      </div>
      <Rail step={-1} />
    </Ticket>
  }

  if (state === 'error') {
    return <Ticket head={<span>Your requests</span>} foot={<><Link className="home-ticket-link" to="/my-requests">Open my requests</Link><Button type="button" variant="secondary" onClick={onRetry}><RotateCw size={16} aria-hidden="true" /> Try again</Button></>}>
      <h2 id="ticket-title" className="home-ticket-title">Requests didn’t load</h2>
      <p className="home-ticket-note">Your requests are safe. Check your connection, then try again.</p>
    </Ticket>
  }

  const open = openRequests(requests)
  const current = open[0]

  if (!current) {
    return <Ticket head={<span>Your requests</span>} foot={<>
      {requests.length ? <Link className="home-ticket-link" to="/my-requests">Past requests ({requests.length})</Link> : <span className="home-ticket-muted">No requests yet</span>}
      <a className="button button-secondary" href="#services">Browse services <ArrowRight size={16} aria-hidden="true" /></a>
    </>}>
      <h2 id="ticket-title" className="home-ticket-title">Nothing in progress</h2>
      <p className="home-ticket-note">Search for a service, choose a provider, and send a request. Each step shows up here.</p>
      <Rail step={-1} />
    </Ticket>
  }

  const { request, progress } = current
  const others = open.length - 1

  return <Ticket
    head={<><span>Your request · #{request.id}</span><span className="home-ticket-step">Step {progress.step + 1}<span> / {REQUEST_STEPS.length}</span></span></>}
    foot={<>
      <Link className="home-ticket-link" to="/my-requests">{others ? `${others} more open` : 'All requests'}</Link>
      <Button href="/my-requests">{progress.action ?? 'View request'} <ArrowRight size={16} aria-hidden="true" /></Button>
    </>}
  >
    <h2 id="ticket-title" className="home-ticket-title">{request.service}</h2>
    <p className="home-ticket-provider">with {request.provider_name}</p>
    <p className="home-ticket-status"><strong>{progress.status}</strong> {progress.note}</p>
    <Rail step={progress.step} />
    <p className="home-ticket-time"><CalendarClock size={16} aria-hidden="true" /> Your preferred time: {preferredTime.format(new Date(request.preferred_at))}</p>
  </Ticket>
}
