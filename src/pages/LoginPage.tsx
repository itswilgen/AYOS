import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import FormField from '../components/auth/FormField'
import GoogleAuthButton from '../components/auth/GoogleAuthButton'
import PasswordField from '../components/auth/PasswordField'
import Button from '../components/ui/Button'
import { ApiError, authRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

function fieldsFrom(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null || !('errors' in error.details)) return {}
  const errors = error.details.errors
  return typeof errors === 'object' && errors !== null
    ? Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : 'Check this field.']))
    : {}
}

export default function LoginPage() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(true)
  const { user, loading: authLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const googleError = searchParams.get('google_error')
  const googleMessage = googleError === 'cancelled'
    ? 'Google sign-in was cancelled. You can try again or sign in with your email.'
    : googleError === 'account'
      ? 'This Google account could not be matched safely. Sign in with your AYOS email and password.'
      : googleError
        ? 'Google sign-in could not be completed. Please try again.'
        : ''

  if (authLoading) return <div className="route-loading" role="status">Checking your AYOS session…</div>
  if (user) return <Navigate to={user.email_verified ? '/account' : '/verify-email'} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    setErrors({})
    setBusy(true)
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const next: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter the email address on your AYOS account.'
    if (!password) next.password = 'Enter your password to continue.'
    if (Object.keys(next).length) {
      setErrors(next)
      setBusy(false)
      requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus())
      return
    }
    try {
      const result = await authRequest<{ two_factor?: boolean }>('/login', {
        method: 'POST', body: JSON.stringify({ email, password, remember }),
      })
      if (result?.two_factor) {
        navigate('/mfa/challenge', { replace: true })
        return
      }
      const user = await refreshUser()
      const destination = (location.state as { from?: string } | null)?.from || '/account'
      navigate(user && !user.email_verified
        ? '/verify-email'
        : user && !user.address_complete
          ? '/account/address'
          : destination, { replace: true })
    } catch (error) {
      const serverFields = fieldsFrom(error)
      if (Object.keys(serverFields).length) setErrors(serverFields)
      else setNotice(error instanceof Error ? error.message : 'We couldn’t sign you in. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-form-shell login-shell">
    <span className="auth-kicker">Welcome back</span><h1>Good to see you again.</h1>
    <p className="auth-intro">Sign in to pick up where you left off. Your account stays yours on every device.</p>
    {googleMessage && <p className="form-notice" role="alert">{googleMessage}</p>}
    <form onSubmit={submit} noValidate>
      <FormField label="Email address" name="email" type="email" autoComplete="username" inputMode="email" placeholder="you@example.com" startAdornment={<Mail size={18} />} error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" startAdornment={<LockKeyhole size={18} />} error={errors.password} />
      <div className="form-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> <span>Remember me</span></label><Link className="quiet-link" to="/forgot-password">Forgot password?</Link></div>
      {notice && <p className="form-notice" role="alert">{notice}</p>}
      <Button type="submit" className="form-submit" disabled={busy} aria-busy={busy}>{busy ? 'Signing you in…' : 'Sign in'} {!busy && <ArrowRight size={17} />}</Button>
    </form>
    <GoogleAuthButton />
    <p className="auth-switch">New to AYOS? <Link to="/signup">Create an account</Link></p>
    <div className="auth-security-note login-security-note"><ShieldCheck size={16} aria-hidden="true" /><p>Your sign-in is protected with a secure AYOS session. We never save your password in your browser.</p></div>
  </div>
}
