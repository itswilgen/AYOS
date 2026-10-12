import { Link, NavLink, useLocation } from 'react-router-dom'
import { CircleUserRound, ClipboardList, Home, Wrench } from 'lucide-react'

export default function MobileBottomNav() {
  const location = useLocation()
  return <nav className="app-bottom-nav" aria-label="Main navigation">
    <NavLink to="/home" end><Home size={19} aria-hidden="true" /><span>Home</span></NavLink>
    <Link className={location.pathname === '/home' && location.hash === '#services' ? 'active' : ''} to="/home#services"><Wrench size={19} aria-hidden="true" /><span>Services</span></Link>
    <Link className={location.pathname === '/home' && location.hash === '#requests' ? 'active' : ''} to="/home#requests"><ClipboardList size={19} aria-hidden="true" /><span>Requests</span></Link>
    <NavLink to="/account/profile"><CircleUserRound size={19} aria-hidden="true" /><span>Profile</span></NavLink>
  </nav>
}
