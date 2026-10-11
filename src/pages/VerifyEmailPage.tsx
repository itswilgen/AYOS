import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import { authRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(5, name.length - 1)))}@${domain}`
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [message, setMessage] = useState(params.get('verified') === '1'
    ? 'Your email is verified. You’re ready to use AYOS.'
    : params.get('invalid') === '1' ? 'That verification link is expired or invalid. Sign in to request a fresh one.' : '')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const resend = async () => {
    setBusy(true)
    try {
      await authRequest('/api/email/verification-notification', { method: 'POST', body: '{}' })
      setMessage('If your account still needs verification, we sent a fresh link.')
      setCooldown(60)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We couldn’t send the link. Please try again.') }
    finally { setBusy(false) }
  }
  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return <div className="auth-form-shell"><span className="auth-kicker">One small step</span><h1>Check your inbox.</h1><p className="auth-intro">We sent a verification link{user?.email ? <> to <strong>{maskEmail(user.email)}</strong></> : ''}. Open it to confirm your email before using AYOS.</p>
    <div className="verify-email-mark"><MailCheck size={26} aria-hidden="true" /></div>
    {message && <p className="form-notice" role="status">{message}</p>}
    {user && !user.email_verified && <><Button className="form-submit" type="button" disabled={busy || cooldown > 0} onClick={resend}>{busy ? 'Sending…' : cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}</Button><button className="quiet-link verify-signout" type="button" onClick={() => void logout()}>Sign out</button></>}
    <p className="auth-switch">Need a different account? <Link to="/login">Sign in</Link></p>
  </div>
}
