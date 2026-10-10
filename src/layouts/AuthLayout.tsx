import { Link, Outlet, useLocation } from 'react-router-dom'
import Brand from '../components/common/Brand'
export default function AuthLayout() {
  const { pathname } = useLocation()
  return <main className="auth-page"><section className="auth-story" aria-label="About AYOS"><Brand /><div className="auth-story-copy"><span className="eyebrow">A little help goes a long way</span><h2 aria-hidden="true">Good work.<br />Good people.<br /><em>AYOS.</em></h2><p>Find skilled local service providers for the things that keep your home and community running.</p></div><p className="auth-story-foot">Built for the way we live here.</p></section><section className="auth-panel"><div className="auth-mobile-brand"><Brand /></div><Outlet />{pathname === '/login' && <p className="auth-legal">By continuing, you agree to AYOS’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>}</section></main>
}
