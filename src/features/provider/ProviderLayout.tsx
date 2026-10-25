import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, ChevronDown, ClipboardList, House, LayoutDashboard, MapPinned, Menu, MessagesSquare, ShieldCheck, Star, UserRound, Wrench, X } from 'lucide-react'
import Brand from '../../components/common/Brand'
import { useAuth } from '../../lib/auth/useAuth'
import { useInboxUnread } from '../../lib/hooks/useInboxUnread'
import { providerWorkspaceService } from '../../services/provider.service'
import type { ProviderWorkspaceData } from '../../types/provider'
import type { ProviderOutletContext } from './provider-context'
import './provider.css'

// One flat list keeps the phone nav order (first four in the bar, the rest under More); the sidebar groups it.
const links = [
  { to: '/provider', label: 'Overview', icon: LayoutDashboard, end: true, group: 'Work' },
  { to: '/provider/requests', label: 'Requests', icon: ClipboardList, group: 'Work' },
  { to: '/provider/messages', label: 'Messages', icon: MessagesSquare, group: 'Work' },
  { to: '/provider/jobs', label: 'My Jobs', icon: BriefcaseBusiness, group: 'Work' },
  { to: '/provider/schedule', label: 'Schedule', icon: CalendarDays, group: 'Work' },
  { to: '/provider/services', label: 'My Services', icon: Wrench, group: 'Business' },
  { to: '/provider/service-areas', label: 'Service Areas', icon: MapPinned, group: 'Business' },
  { to: '/provider/reviews', label: 'Reviews', icon: Star, group: 'Business' },
  { to: '/provider/profile', label: 'Profile', icon: UserRound, group: 'Account' },
  { to: '/provider/access', label: 'Quota & Access', icon: ShieldCheck, group: 'Account' },
  { to: '/provider/notifications', label: 'Notifications', icon: Bell, group: 'Account' },
]
const linkGroups = ['Work', 'Business', 'Account'] as const

export default function ProviderLayout() {
  const { user } = useAuth()
  const [data, setData] = useState<ProviderWorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const unreadMessages = useInboxUnread().provider

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try { setData(await providerWorkspaceService.getWorkspace(user.id, user.name)) }
    catch { setError('We couldn’t load your provider workspace. Please try again.') }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    void providerWorkspaceService.getWorkspace(user.id, user.name).then((workspace) => {
      if (active) setData(workspace)
    }).catch(() => {
      if (active) setError('We couldn’t load your provider workspace. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [user])
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false) }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])

  const run: ProviderOutletContext['run'] = async (action, success) => {
    if (!user || busy) return false
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setData(await action(user.id, user.name))
      if (success) setMessage(success)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t save that change. Please try again.')
      return false
    } finally { setBusy(false) }
  }

  const unread = data?.notifications.filter((item) => !item.read).length ?? 0
  const newRequests = data?.requests.filter((item) => item.status === 'new').length ?? 0
  const approved = data?.approved === true
  const applicationMode = data !== null && !approved
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AY'

  return <div className={`provider-shell${applicationMode ? ' provider-shell-application' : ''}`}>
    <a className="skip-link" href="#provider-main">Skip to provider content</a>
    {!applicationMode && <aside className="provider-sidebar" aria-label="Provider navigation">
      <div className="provider-brand"><Brand to="/provider" /><span>{approved ? 'PROVIDER WORKSPACE' : 'PROVIDER APPLICATION'}</span></div>
      {approved && <nav className="provider-side-nav" aria-label="Provider sections">{linkGroups.map((group) => <div key={group} className="provider-nav-group" role="group" aria-labelledby={`provider-nav-${group.toLowerCase()}`}><span className="provider-sidebar-label" id={`provider-nav-${group.toLowerCase()}`}>{group}</span>{links.filter((link) => link.group === group).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMoreOpen(false)}><Icon size={18} aria-hidden="true" /><span>{label}</span>{label === 'Requests' && newRequests > 0 && <small>{newRequests}</small>}{label === 'Messages' && unreadMessages > 0 && <small>{unreadMessages}</small>}{label === 'Notifications' && unread > 0 && <small>{unread}</small>}</NavLink>)}</div>)}</nav>}
      <div className="provider-sidebar-bottom"><Link to="/home"><House size={18} aria-hidden="true" /> Switch to Customer Mode</Link><p>Your customer account stays the same.</p></div>
    </aside>}
    <div className="provider-body">
      {!applicationMode && <header className="provider-topbar">
        <div className="provider-mobile-brand"><Brand to="/provider" /><span>{approved ? 'Provider' : 'Application'}</span></div>
        <div className="provider-topbar-context"><span className="provider-topbar-date"><CalendarDays size={16} aria-hidden="true" />{today}</span><span>{approved ? 'Manage your local service work' : 'Your provider application'}</span></div>
        <div className="provider-topbar-actions">{approved ? <><Link className="provider-bell" to="/provider/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={20} aria-hidden="true" />{unread > 0 && <i aria-hidden="true" />}</Link><Link className="provider-user" to="/provider/profile"><span>{initials}</span><strong>{user?.name.trim().split(/\s+/)[0] || 'Provider'}</strong><ChevronDown size={15} aria-hidden="true" /></Link></> : <Link className="provider-topbar-customer" to="/home">Customer mode <ArrowRight size={16} aria-hidden="true" /></Link>}</div>
      </header>}
      <main id="provider-main" className={`provider-main${data && !approved ? ' provider-main-onboarding' : ''}`}>
        {loading ? <div className="provider-state" role="status">Loading your provider workspace…</div> : !data ? <div className="provider-state" role="alert"><h1>Workspace unavailable</h1><p>{error}</p><button type="button" className="provider-button provider-button-primary" onClick={() => void load()}>Try again</button></div> : !data.approved ? <div className="provider-state provider-onboarding-state"><div className="provider-onboarding-brand"><Brand to="/provider" /></div><span className="provider-onboarding-icon"><BriefcaseBusiness size={25} aria-hidden="true" /></span><span className="provider-eyebrow">{data.applicationStatus === 'none' ? 'START YOUR APPLICATION' : 'APPLICATION STATUS'}</span><h1>{data.applicationStatus === 'none' ? 'Become an AYOS provider' : data.applicationStatus === 'rejected' ? 'Application not approved' : 'Application under review'}</h1><p>{data.applicationStatus === 'none' ? 'Share your skills and service area to start your provider application.' : data.applicationStatus === 'rejected' ? 'Your provider application was not approved. Contact AYOS support for details.' : 'We’re reviewing your application. Your provider tools will be available once it’s approved.'}</p><div className="provider-state-actions">{data.applicationStatus === 'none' && <Link className="provider-button provider-button-primary" to="/provider/apply">Apply now <ArrowRight size={16} aria-hidden="true" /></Link>}<Link className="provider-button" to="/home">Return to customer mode</Link></div></div> : <>
          {error && <div className="provider-alert provider-alert-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {message && <div className="provider-alert provider-alert-success" role="status"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}
          <Outlet context={{ data, busy, error, run, clearError: () => setError(''), message } satisfies ProviderOutletContext} />
        </>}
      </main>
    </div>
    {approved && <nav className="provider-mobile-nav" aria-label="Provider mobile navigation">
      {links.slice(0, 4).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label === 'Messages' && unreadMessages ? `Messages, ${unreadMessages} unread` : undefined}><Icon size={20} aria-hidden="true" />{label === 'Messages' && unreadMessages > 0 && <i className="provider-mobile-dot" aria-hidden="true" />}<span>{label === 'Overview' ? 'Home' : label === 'My Jobs' ? 'Jobs' : label}</span></NavLink>)}
      <button type="button" aria-expanded={moreOpen} aria-controls="provider-more-menu" onClick={() => setMoreOpen((open) => !open)}>{moreOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}<span>More</span></button>
    </nav>}
    {approved && moreOpen && <div className="provider-more-menu" id="provider-more-menu"><div className="provider-more-heading"><strong>More provider tools</strong><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={19} /></button></div>{links.slice(4).map(({ to, label, icon: Icon }) => <Link key={to} to={to} onClick={() => setMoreOpen(false)}><span className="provider-more-icon" aria-hidden="true"><Icon size={18} /></span>{label}</Link>)}<Link to="/home" onClick={() => setMoreOpen(false)}><span className="provider-more-icon" aria-hidden="true"><House size={18} /></span>Switch to Customer Mode</Link></div>}
  </div>
}
