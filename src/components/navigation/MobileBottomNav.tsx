import { Link, NavLink, useLocation } from 'react-router-dom'
import { CircleUserRound, ClipboardList, Home, MessagesSquare, Wrench } from 'lucide-react'
import { useInboxUnread } from '../../lib/hooks/useInboxUnread'

export default function MobileBottomNav() {
  const location = useLocation()
  const unread = useInboxUnread().customer
  return <nav className="app-bottom-nav" aria-label="Main navigation">
    <NavLink to="/home" end><Home size={19} aria-hidden="true" /><span>Home</span></NavLink>
    <Link className={location.pathname === '/home' && location.hash === '#services' ? 'active' : ''} to="/home#services"><Wrench size={19} aria-hidden="true" /><span>Services</span></Link>
    <NavLink to="/my-requests"><ClipboardList size={19} aria-hidden="true" /><span>Requests</span></NavLink>
    <NavLink to="/messages" aria-label={unread ? `Messages, ${unread} unread` : undefined}><span className="app-bottom-icon"><MessagesSquare size={19} aria-hidden="true" />{unread > 0 && <i className="app-nav-count" aria-hidden="true">{unread > 9 ? '9+' : unread}</i>}</span><span>Messages</span></NavLink>
    <NavLink to="/account/profile"><CircleUserRound size={19} aria-hidden="true" /><span>Profile</span></NavLink>
  </nav>
}
