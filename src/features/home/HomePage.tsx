import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import Button from '../../components/ui/Button'
import HomeSearch from './components/HomeSearch'
import RequestTicket from './components/RequestTicket'
import NeedsYou from './components/NeedsYou'
import OpenRequests from './components/OpenRequests'
import ServiceCategories from './components/ServiceCategories'
import AddressPrompt from './components/AddressPrompt'
import { locationLabel, serviceSearchPath } from './home-links'
import { needsYouItems } from './request-progress'
import { useAuth } from '../../lib/auth/useAuth'
import { locationsService } from '../../services/locations.service'
import { requestsService, servicesService } from '../../services/home.service'
import { messagesService } from '../../services/messages.service'
import type { ConversationSummary } from '../../types/messages'
import type { CustomerRequest, ServiceCategory, ServiceLocationSummary } from '../../types/marketplace'
import './home-page.css'

type LoadState = 'loading' | 'ready' | 'error'

const POPULAR_SLUGS = ['aircon', 'plumbing', 'electrical', 'phone-repair']
const rise = (index: number) => ({ '--i': index }) as CSSProperties

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export default function HomePage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [categoryState, setCategoryState] = useState<LoadState>('loading')
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [locationsLoaded, setLocationsLoaded] = useState(false)
  /** True only when saved locations loaded successfully, so a failed request never looks like "no address yet". */
  const [locationsKnown, setLocationsKnown] = useState(false)
  const [requests, setRequests] = useState<CustomerRequest[]>([])
  const [requestState, setRequestState] = useState<LoadState>('loading')
  /** Customer chats, for unread messages in "Needs you". If they fail to load, Home simply shows no message to-dos. */
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const { hash } = useLocation()

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      servicesService.getCategories(),
      locationsService.getSavedLocations(),
      requestsService.getRequests(),
      messagesService.list('customer'),
    ]).then(([categoryResult, locationResult, requestResult, conversationResult]) => {
      if (!active) return
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
      setCategoryState(categoryResult.status === 'fulfilled' ? 'ready' : 'error')
      if (locationResult.status === 'fulfilled') {
        setLocations(locationResult.value)
        setLocationsKnown(true)
      }
      setLocationsLoaded(true)
      if (requestResult.status === 'fulfilled') setRequests(requestResult.value)
      setRequestState(requestResult.status === 'fulfilled' ? 'ready' : 'error')
      if (conversationResult.status === 'fulfilled') setConversations(conversationResult.value)
    })
    return () => { active = false }
  }, [])

  // The bottom nav's Services tab links to /home#services; scroll there once the grid has rendered.
  useEffect(() => {
    if (hash !== '#services' || categoryState !== 'ready') return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('services')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [hash, categoryState])

  const retryCategories = () => {
    setCategoryState('loading')
    servicesService.getCategories().then((items) => { setCategories(items); setCategoryState('ready') }, () => setCategoryState('error'))
  }
  const retryRequests = () => {
    setRequestState('loading')
    requestsService.getRequests().then((items) => { setRequests(items); setRequestState('ready') }, () => setRequestState('error'))
  }

  const location = locations.find((item) => item.is_default) ?? locations[0]
  const firstName = user?.name.trim().split(/\s+/)[0]
  const todo = requestState === 'ready' ? needsYouItems(requests, conversations) : []
  const popular = POPULAR_SLUGS.map((slug) => categories.find((category) => category.slug === slug)).filter((category) => category !== undefined)

  return <div className="app-page home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-band" aria-hidden="true">
        <img src="/images/hero/04-get-the-work-done.webp" alt="" width="1200" height="1500" decoding="async" fetchPriority="high" />
      </div>

      <div className="home-hero-copy">
        <p className="home-kicker home-rise">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
        <h1 id="home-title" className="home-hero-title home-rise" style={rise(1)}>What needs <em>fixing</em> today?</h1>
        <p className="home-hero-area home-rise" style={rise(2)}>{!locationsLoaded ? ' ' : location
          ? <><MapPin size={16} aria-hidden="true" /> Showing help near <strong>{locationLabel(location)}</strong> <Link to="/account/locations">Change</Link></>
          : <><MapPin size={16} aria-hidden="true" /> <Link to="/account/locations?add=1">Add your address</Link> to see who serves your area</>}</p>
        <div className="home-rise" style={rise(3)}><HomeSearch categories={categories} location={location} /></div>
        {popular.length > 0 && <div className="home-popular home-rise" style={rise(4)}>
          <span className="home-popular-label" id="home-popular-label">Popular</span>
          <ul aria-labelledby="home-popular-label">{popular.map((category) => <li key={category.id}>
            <Link className="home-chip" to={serviceSearchPath(category.name, location)}>{category.name}</Link>
          </li>)}</ul>
        </div>}
      </div>

      <div className="home-hero-ticket home-rise" style={rise(3)}>
        <RequestTicket requests={requests} state={requestState} onRetry={retryRequests} />
      </div>
    </section>

    <NeedsYou items={todo} />
    <OpenRequests requests={requests} />

    {categoryState === 'loading' && <div className="home-section home-services-loading" role="status">Loading services…</div>}
    {categoryState === 'error' && <section className="home-section home-section-error" role="alert">
      <h2>Services didn’t load</h2>
      <p>Your account details are safe. Check your connection, then try again.</p>
      <button type="button" onClick={retryCategories}>Try again</button>
    </section>}
    {categoryState === 'ready' && categories.length > 0 && <ServiceCategories categories={categories} location={location} />}

    {/* A fresh account has no saved address yet: ask for it right away. */}
    {locationsKnown && locations.length === 0 && <AddressPrompt onSaved={(saved) => setLocations([saved])} />}

    <section className="home-invite" aria-labelledby="home-invite-title">
      <div>
        <p className="home-kicker">For skilled workers</p>
        <h2 id="home-invite-title">Have a trade? Take requests on AYOS.</h2>
        <p>Apply with the account you already have. We review every provider before they can take requests.</p>
      </div>
      <Button href="/provider/apply" variant="secondary">Apply as a provider <ArrowRight size={16} aria-hidden="true" /></Button>
    </section>
  </div>
}
