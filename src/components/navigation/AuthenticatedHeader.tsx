import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, CircleUserRound, LogOut, MapPin, Settings2, UserRound, X } from 'lucide-react'
import Brand from '../common/Brand'
import { useAuth } from '../../lib/auth/useAuth'
import { useInboxUnread } from '../../lib/hooks/useInboxUnread'
import { notificationsService } from '../../services/home.service'
import type { NotificationSummary } from '../../types/marketplace'

export default function AuthenticatedHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSummary[]>([])
  const [noticeError, setNoticeError] = useState('')
  const [signOutError, setSignOutError] = useState('')
  const unreadMessages = useInboxUnread().customer
  const profileRef = useRef<HTMLDivElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void notificationsService.getNotifications().then(setNotifications).catch(() => {})
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
        <NavLink to="/my-requests">My requests</NavLink>
        <NavLink to="/messages" aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : undefined}>Messages{unreadMessages > 0 && <span className="app-nav-count" aria-hidden="true">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}</NavLink>
      </nav>
      <div className="app-header-actions">
        <div className="app-popover-anchor" ref={noticeRef}>
          <button className="app-icon-button" type="button" aria-label="Notifications" aria-expanded={noticeOpen} aria-controls="notification-popover" onClick={() => { setNoticeOpen((open) => !open); setProfileOpen(false); void notificationsService.getNotifications().then(setNotifications).catch(() => {}) }}>
            <Bell size={19} aria-hidden="true" />
            {notifications.some((notification) => notification.unread) && <span className="app-notification-dot" aria-label="Unread notifications" />}
          </button>
          {noticeOpen && <section className="app-popover app-notice-popover" id="notification-popover" aria-label="Notifications">
            <div className="app-popover-heading"><div><strong>Notifications</strong><span>{notifications.filter((notification) => notification.unread).length} unread</span></div><button type="button" aria-label="Close notifications" onClick={() => setNoticeOpen(false)}><X size={17} /></button></div>
            {noticeError && <p className="app-popover-error" role="alert">{noticeError}</p>}
            {notifications.length ? <ul className="app-notification-list">{notifications.map((item) => <li key={item.id}>{item.unread && <span className="app-notification-mark" />}<button type="button" onClick={() => { setNoticeError(''); void notificationsService.markRead(item.id).then(() => { setNotifications((items) => items.map((note) => note.id === item.id ? { ...note, unread: false } : note)); setNoticeOpen(false); navigate(item.href || '/my-requests') }).catch(() => { setNoticeError('We couldn’t open that update. Please try again.') }) }}><strong>{item.title}</strong><p>{item.description}</p><small>{item.createdAtLabel}</small></button></li>)}</ul> : <div className="app-popover-empty"><Bell size={20} aria-hidden="true" /><strong>You’re all caught up</strong><p>Updates about your service activity will show up here.</p></div>}
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
              <Link to="/account/locations?add=1" onClick={() => setProfileOpen(false)}><MapPin size={17} /> My addresses</Link>
              <Link to="/provider" onClick={() => setProfileOpen(false)}><Settings2 size={17} /> Switch to Provider Mode</Link>
            </nav>
            {signOutError && <p className="app-popover-error" role="alert">{signOutError}</p>}
            <button className="app-signout-button" type="button" onClick={() => void logout()}><LogOut size={17} /> Sign out</button>
          </section>}
        </div>
      </div>
    </div>
  </header>
}
