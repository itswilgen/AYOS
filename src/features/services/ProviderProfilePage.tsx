import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Award, BadgeCheck, CalendarDays, Hammer, MapPin, MessageCircle, MessagesSquare, PencilLine, Repeat2, Trophy, type LucideIcon } from 'lucide-react'
import Button from '../../components/ui/Button'
import { ApiError } from '../../lib/api/client'
import { messagesService, providerProfileService } from '../../services/messages.service'
import type { ProviderAchievementKey, PublicProviderProfile } from '../../types/messages'
import ProviderReviews, { Stars } from './ProviderReviews'
import ProviderWorkGallery from './ProviderWorkGallery'
import { initials, monthYear, plural } from './profile-format'
import './provider-profile.css'

const achievementIcons: Record<ProviderAchievementKey, LucideIcon> = { top_rated: Trophy, jobs_milestone: Award, repeat_customers: Repeat2, experienced: Hammer }

/** What a customer sees before booking: proof of past work first, then how to get in touch. */
export default function ProviderProfilePage() {
  const { providerId = '' } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicProviderProfile | null>(null)
  const [existingThread, setExistingThread] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [opening, setOpening] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [activeSection, setActiveSection] = useState('pp-overview')

  useEffect(() => {
    let active = true
    Promise.all([providerProfileService.getProfile(providerId), messagesService.list('customer').catch(() => [])]).then(([found, threads]) => {
      if (!active) return
      setProfile(found)
      setExistingThread(threads.find((thread) => thread.counterpart.providerId === providerId)?.id ?? null)
      setStatus('ready')
    }, (cause) => { if (active) setStatus(cause instanceof ApiError && [404, 503].includes(cause.status) ? 'missing' : 'error') })
    return () => { active = false }
  }, [providerId, attempt])

  // Highlights the section nav entry for whichever section is under the sticky bars.
  useEffect(() => {
    if (status !== 'ready') return
    const sections = [...document.querySelectorAll<HTMLElement>('.pp-page [data-section]')]
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-140px 0px -55% 0px' })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [status])

  const openConversation = async () => {
    if (existingThread) { navigate(`/messages/${existingThread}`); return }
    setOpening(true)
    setMessageError('')
    try { navigate(`/messages/${await messagesService.startWithProvider(providerId)}`) }
    catch (cause) { setMessageError(cause instanceof Error ? cause.message : 'We couldn’t open a conversation. Try again.') }
    finally { setOpening(false) }
  }

  const jumpTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActiveSection(id)
  }

  if (status === 'loading') return <main className="app-page pp-page" aria-busy="true"><div className="pp-hero pp-skeleton-hero"><span className="pp-skeleton pp-skeleton-photo" /><div><span className="pp-skeleton pp-skeleton-line is-short" /><span className="pp-skeleton pp-skeleton-line is-title" /><span className="pp-skeleton pp-skeleton-line" /></div></div><span className="sr-only" role="status">Loading provider profile…</span></main>
  if (status !== 'ready' || !profile) return <main className="app-page pp-page"><div className="pp-state" role="alert"><h1>{status === 'error' ? 'This profile didn’t load' : 'This provider isn’t available'}</h1><p>{status === 'error' ? 'Check your connection, then try again.' : 'They may have paused their AYOS profile. Other local providers can help with the same service.'}</p>{status === 'error' ? <Button variant="secondary" onClick={() => { setStatus('loading'); setAttempt((count) => count + 1) }}>Try again</Button> : <Button variant="secondary" href="/services/search">Find another provider</Button>}</div></main>

  const canStart = profile.acceptingRequests || existingThread !== null
  const requestPath = `/services/request/${profile.id}`
  const stats = [
    { key: 'rating', value: profile.rating !== null ? profile.rating.toFixed(1) : 'New', label: profile.rating !== null ? plural(profile.reviewCount, 'review') : 'No reviews yet', stars: profile.rating },
    { key: 'jobs', value: String(profile.completedServices), label: 'jobs done on AYOS' },
    ...(profile.repeatCustomers > 0 ? [{ key: 'repeat', value: String(profile.repeatCustomers), label: profile.repeatCustomers === 1 ? 'repeat customer' : 'repeat customers' }] : []),
    { key: 'years', value: profile.yearsExperience > 0 ? String(profile.yearsExperience) : '—', label: profile.yearsExperience === 1 ? 'year of experience' : 'years of experience' },
  ]
  const sections = [
    { id: 'pp-overview', label: 'Overview' },
    ...(profile.portfolio.length ? [{ id: 'pp-work', label: 'Work', count: profile.portfolio.length }] : []),
    { id: 'pp-reviews', label: 'Reviews', count: profile.reviewCount },
    { id: 'pp-services', label: 'Services', count: profile.services.length },
  ]

  return <main className="app-page pp-page">
    <Link className="account-back-link" to="/services/search"><ArrowLeft size={16} aria-hidden="true" /> Find providers</Link>
    <div className="pp-layout">
      <div className="pp-content">
        <header className="pp-hero">
          <span className="pp-photo">{profile.photo ? <img src={profile.photo} alt={profile.displayName} /> : <span aria-hidden="true">{initials(profile.displayName)}</span>}</span>
          <div className="pp-identity">
            <p className="pp-trades">{profile.services.map((service) => service.category).join(' · ')}</p>
            <h1>{profile.displayName}</h1>
            <p className="pp-badges">
              {profile.verified ? <span className="pp-verified"><BadgeCheck size={16} aria-hidden="true" /> Identity checked</span> : <span>Identity not yet checked</span>}
              {profile.areas.length > 0 && <span><MapPin size={15} aria-hidden="true" />{profile.areas[0]}{profile.areas.length > 1 && ` +${profile.areas.length - 1} more`}</span>}
              {profile.memberSince && <span><CalendarDays size={15} aria-hidden="true" />On AYOS since {monthYear(profile.memberSince)}</span>}
            </p>
          </div>
        </header>

        <nav className="pp-section-nav" aria-label="Profile sections">{sections.map((section) =>
          <a key={section.id} href={`#${section.id}`} onClick={(event) => jumpTo(event, section.id)} aria-current={activeSection === section.id ? 'true' : undefined}>
            {section.label}{'count' in section && section.count ? <span>{section.count}</span> : null}
          </a>)}
        </nav>

        <section id="pp-overview" data-section className="pp-section" aria-label="Overview">
          <dl className="pp-stats" style={{ '--pp-stat-columns': stats.length } as CSSProperties}>{stats.map((stat) => <div key={stat.key}>
            <dt className="sr-only">{stat.label}</dt>
            <dd><strong>{stat.value}</strong>{'stars' in stat && stat.stars != null ? <Stars rating={stat.stars} size={13} /> : null}<span>{stat.label}</span></dd>
          </div>)}</dl>

          {profile.achievements.length > 0 && <div className="pp-subsection">
            <h2>Achievements</h2>
            <ul className="pp-achievements">{profile.achievements.map((achievement) => {
              const Icon = achievementIcons[achievement.key] ?? Award
              return <li key={achievement.key} className={`is-${achievement.key}`}>
                <span className="pp-achievement-icon" aria-hidden="true"><Icon size={20} /></span>
                <p><strong>{achievement.title}</strong><span>{achievement.detail}</span></p>
              </li>
            })}</ul>
          </div>}

          {profile.bio && <div className="pp-subsection"><h2>About</h2><p className="pp-bio">{profile.bio}</p></div>}
        </section>

        {profile.portfolio.length > 0 && <section id="pp-work" data-section className="pp-section" aria-labelledby="pp-work-title">
          <div className="pp-section-head"><h2 id="pp-work-title">Finished work</h2><p>Photos the provider shared from completed jobs.</p></div>
          <ProviderWorkGallery items={profile.portfolio} />
        </section>}

        <section id="pp-reviews" data-section className="pp-section" aria-labelledby="pp-reviews-title">
          <div className="pp-section-head"><h2 id="pp-reviews-title">Customer reviews</h2><p>Only customers with a completed AYOS job can leave a review.</p></div>
          <ProviderReviews id={profile.id} rating={profile.rating} reviewCount={profile.reviewCount} ratingBreakdown={profile.ratingBreakdown} reviews={profile.reviews} />
        </section>

        <section id="pp-services" data-section className="pp-section" aria-labelledby="pp-services-title">
          <div className="pp-section-head"><h2 id="pp-services-title">Services</h2></div>
          <ul className="pp-services">{profile.services.map((service) => <li key={service.id}>
            {service.cover ? <img className={`pp-service-cover is-${service.cover.fit}`} src={service.cover.image} alt="" style={{ objectPosition: `${service.cover.focusX}% ${service.cover.focusY}%` }} loading="lazy" /> : <span className="pp-service-cover is-empty" aria-hidden="true">{service.category.slice(0, 1)}</span>}
            <div>
              <h3>{service.category}</h3>
              {service.description && <p>{service.description}</p>}
              {service.completedJobs > 0 && <p className="pp-service-meta">{plural(service.completedJobs, 'job')} done</p>}
            </div>
            {profile.acceptingRequests && !profile.isOwnProfile && <Link className="pp-service-link" to={`${requestPath}?${new URLSearchParams({ service: service.category })}`} aria-label={`Request ${service.category.toLowerCase()}`}>Request <ArrowRight size={15} aria-hidden="true" /></Link>}
          </li>)}</ul>
          {profile.areas.length > 0 && <div className="pp-subsection"><h3 className="pp-minor-title">Areas served</h3><ul className="pp-areas">{profile.areas.map((area) => <li key={area}><MapPin size={14} aria-hidden="true" />{area}</li>)}</ul></div>}
        </section>
      </div>

      {profile.isOwnProfile ? <aside className="pp-actions is-own" aria-label="Your profile">
        <p className="pp-actions-title">This is your public profile</p>
        <p className="pp-actions-copy">You’re seeing what customers see. They’ll use these buttons to message you or request a service.</p>
        <div className="pp-actions-buttons">
          <Button variant="secondary" href="/provider/profile"><PencilLine size={16} aria-hidden="true" />Edit profile</Button>
          <Button href="/provider/messages"><MessagesSquare size={16} aria-hidden="true" />Customer messages</Button>
        </div>
      </aside> : <aside className="pp-actions" aria-label="Contact this provider">
        {profile.rating !== null && <p className="pp-actions-rating"><Stars rating={profile.rating} /> <strong>{profile.rating.toFixed(1)}</strong> <span>· {plural(profile.reviewCount, 'review')}</span></p>}
        <p className="pp-actions-title">{profile.acceptingRequests ? 'Ask first, or book straight away' : 'Not taking new requests right now'}</p>
        <p className="pp-actions-copy">{profile.acceptingRequests ? 'Messages are free. Contact details are shared once your booking is accepted.' : existingThread ? 'You can still continue your conversation.' : 'Check back later, or find another provider for this service.'}</p>
        <div className="pp-actions-buttons">
          <Button variant="secondary" className="pp-message" onClick={() => void openConversation()} disabled={!canStart} loading={opening}>{!opening && <MessageCircle size={17} aria-hidden="true" />}{existingThread ? 'Continue conversation' : 'Message'}</Button>
          {profile.acceptingRequests && <Button href={requestPath}>Request service <ArrowRight size={16} aria-hidden="true" /></Button>}
        </div>
        {messageError && <p className="pp-action-error" role="alert">{messageError}</p>}
      </aside>}
    </div>
  </main>
}
