import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import Brand from '../components/common/Brand'

export default function AuthLayout() {
  const { pathname } = useLocation()
  const isLogin = pathname === '/login'
  return <main className={`auth-page${isLogin ? ' is-login' : ''}`}>
    <section className="auth-story" aria-label="About AYOS">
      <img className="auth-story-photo" src="/images/hero/04-get-the-work-done.webp" alt="" width="1200" height="1500" decoding="async" />
      <div className="auth-story-top"><Brand /></div>
      <p className="auth-story-status" aria-hidden="true"><span />Accepted by provider</p>
      <div className="auth-story-copy">
        <span className="auth-story-eyebrow">A little help goes a long way</span>
        <h2 aria-hidden="true">Good work.<br />Good people.<br /><em>AYOS.</em></h2>
        <p>Find skilled local service providers for the things that keep your home and community running.</p>
        <p className="auth-story-foot"><ShieldCheck size={16} aria-hidden="true" />Secure sign-in. We never save your password in your browser.</p>
      </div>
    </section>
    <section className="auth-panel">
      <div className="auth-mobile-brand"><Brand /></div>
      <Outlet />
      {isLogin && <p className="auth-legal">By continuing, you agree to AYOS’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>}
    </section>
  </main>
}
