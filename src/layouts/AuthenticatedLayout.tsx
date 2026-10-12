import { Outlet } from 'react-router-dom'
import AuthenticatedHeader from '../components/navigation/AuthenticatedHeader'
import MobileBottomNav from '../components/navigation/MobileBottomNav'
import { Link } from 'react-router-dom'
import '../features/home/home.css'

export default function AuthenticatedLayout() {
  return <div className="ayos-app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <AuthenticatedHeader />
    <main id="main-content" className="app-main"><Outlet /></main>
    <footer className="app-footer"><span>© {new Date().getFullYear()} AYOS</span><nav aria-label="Footer"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><a href="mailto:hello@ayos.ph">Help</a></nav><span className="app-footer-note">Good work starts with good people.</span></footer>
    <MobileBottomNav />
  </div>
}
