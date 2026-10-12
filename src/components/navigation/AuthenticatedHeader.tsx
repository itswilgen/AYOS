import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, CircleUserRound, LogOut, MapPin, Search, Settings2, ShieldCheck, UserRound, X } from 'lucide-react'
import Brand from '../common/Brand'
import { useAuth } from '../../lib/auth/useAuth'
import { notificationsService } from '../../services/home.service'
import type { NotificationSummary } from '../../types/marketplace'

export default function AuthenticatedHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSummary[]>([])
  const [signOutError, setSignOutError] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void notificationsService.getNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
      if (!noticeRef.current?.contains(event.target as Node)) setNoticeOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setNoticeOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const displayName = user?.name?.trim() || 'AYOS customer'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()

  const logout = async () => {
    setSignOutError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('We couldn’t sign you out. Please try again.')
    }
  }

  return <header className="app-header">
    <div className="app-header-inner">
      <Brand />
      <nav className="app-primary-nav" aria-label="Customer navigation">
        <NavLink to="/home" end>Home</NavLink>
        <Link className={location.pathname === '/home' && location.hash === '#services' ? 'active' : ''} to="/home#services" onClick={(event) => {
          if (location.pathname === '/home') {
            event.preventDefault()
            navigate('/home#services')
            document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}>Services</Link>
        <Link className={location.pathname === '/home' && location.hash === '#requests' ? 'active' : ''} to="/home#requests" onClick={(event) => {
          if (location.pathname === '/home') {
            event.preventDefault()
            navigate('/home#requests')
            document.getElementById('requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}>My requests</Link>
      </nav>
      <div className="app-header-actions">
        <Link className="app-search-shortcut" to="/home#service-search" aria-label="Find a service"><Search size={18} /><span>Find a service</span></Link>
        <div className="app-popover-anchor" ref={noticeRef}>
          <button className="app-icon-button" type="button" aria-label="Notifications" aria-expanded={noticeOpen} aria-controls="notification-popover" onClick={() => { setNoticeOpen((open) => !open); setProfileOpen(false) }}>
            <Bell size={19} aria-hidden="true" />
            {notifications.some((notification) => notification.unread) && <span className="app-notification-dot" aria-label="Unread notifications" />}
          </button>
          {noticeOpen && <section className="app-popover app-notice-popover" id="notification-popover" aria-label="Notifications">
            <div className="app-popover-heading"><div><strong>Notifications</strong><span>{notifications.filter((notification) => notification.unread).length} unread</span></div><button type="button" aria-label="Close notifications" onClick={() => setNoticeOpen(false)}><X size={17} /></button></div>
            {notifications.length ? <ul className="app-notification-list">{notifications.map((item) => <li key={item.id}><span className="app-notification-mark" /><div><strong>{item.title}</strong><p>{item.description}</p><small>{item.createdAtLabel}</small></div></li>)}</ul> : <div className="app-popover-empty"><Bell size={20} aria-hidden="true" /><strong>You’re all caught up</strong><p>Updates about your service activity will show up here.</p></div>}
          </section>}
        </div>
        <div className="app-popover-anchor" ref={profileRef}>
          <button className="app-profile-trigger" type="button" aria-expanded={profileOpen} aria-controls="profile-popover" onClick={() => { setProfileOpen((open) => !open); setNoticeOpen(false) }}>
            <span className="app-avatar" aria-hidden="true">{initials || <CircleUserRound size={20} />}</span><span className="app-profile-name">{displayName.split(' ')[0]}</span><ChevronDown size={15} aria-hidden="true" />
          </button>
          {profileOpen && <section className="app-popover app-profile-popover" id="profile-popover" aria-label="Account menu">
            <div className="app-profile-summary"><span className="app-avatar app-avatar-large" aria-hidden="true">{initials}</span><div><strong>{displayName}</strong><span>{user?.email}</span></div></div>
            <nav aria-label="Account menu links">
              <Link to="/account/profile" onClick={() => setProfileOpen(false)}><UserRound size={17} /> View profile</Link>
              <Link to="/account/locations" onClick={() => setProfileOpen(false)}><MapPin size={17} /> Saved locations</Link>
              <Link to="/account/security" onClick={() => setProfileOpen(false)}><ShieldCheck size={17} /> Sign-in &amp; security</Link>
              <Link to="/provider/apply" onClick={() => setProfileOpen(false)}><Settings2 size={17} /> Become a provider</Link>
            </nav>
            {signOutError && <p className="app-popover-error" role="alert">{signOutError}</p>}
            <button className="app-signout-button" type="button" onClick={() => void logout()}><LogOut size={17} /> Sign out</button>
          </section>}
        </div>
      </div>
    </div>
  </header>
}
