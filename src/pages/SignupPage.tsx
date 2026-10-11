import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
    ? Object.fromEntries(Object.entries(errors).map(([key, value]) => [key === 'mobile_number' ? 'mobile' : key === 'password_confirmation' ? 'confirm' : key, Array.isArray(value) ? String(value[0]) : 'Check this field.']))
    : {}
}

export default function SignupPage() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const { user, loading: authLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  if (authLoading) return <div className="route-loading" role="status">Checking your AYOS session…</div>
  if (user) return <Navigate to={user.email_verified ? '/account' : '/verify-email'} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    setErrors({})
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const mobile = String(data.get('mobile') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')
    const next: Record<string, string> = {}
    if (name.length < 2) next.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!/^\+?[\d\s().-]{7,32}$/.test(mobile)) next.mobile = 'Enter a valid mobile number.'
    if (password.length < 12) next.password = 'Use at least 12 characters.'
    if (confirm !== password || !confirm) next.confirm = 'Your passwords don’t match.'
    if (!accepted) next.terms = 'Please agree to the Terms and Privacy Policy to continue.'
    if (Object.keys(next).length) {
      setErrors(next)
      requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus())
      return
    }
    setBusy(true)
    try {
      await authRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile_number: mobile, password, password_confirmation: confirm, terms_accepted: accepted }),
      })
      await refreshUser()
      navigate('/verify-email', { replace: true })
    } catch (error) {
      const serverFields = fieldsFrom(error)
      if (Object.keys(serverFields).length) setErrors(serverFields)
      else setNotice(error instanceof Error ? error.message : 'We couldn’t create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="auth-form-shell signup-shell">
    <span className="auth-kicker">Your next step starts here</span><h1>Create your AYOS account.</h1>
    <p className="auth-intro">One account to find help and take part in your community. You can apply to offer services later.</p>
    <form onSubmit={submit} noValidate>
      <FormField label="Full name" name="name" type="text" autoComplete="name" placeholder="Your full name" error={errors.name} />
      <FormField label="Email address" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" hint="We’ll send a link to verify this address." error={errors.email} />
      <FormField label="Mobile number" name="mobile" type="tel" autoComplete="tel" inputMode="tel" placeholder="+63 9XX XXX XXXX" hint="Use the number where we can reach you." error={errors.mobile} />
      <PasswordField label="Password" name="password" autoComplete="new-password" placeholder="At least 12 characters" hint="Longer passphrases are easier to remember and harder to guess." error={errors.password} />
      <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" placeholder="Enter your password again" error={errors.confirm} />
      <div className="terms-row"><label className="check-label"><input id="terms" type="checkbox" checked={accepted} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'terms-error' : undefined} onChange={e => setAccepted(e.target.checked)} /><span>I agree to AYOS’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>{errors.terms && <p id="terms-error" className="field-error" role="alert">{errors.terms}</p>}</div>
      {notice && <p className="form-notice" role="alert">{notice}</p>}
      <Button type="submit" className="form-submit" disabled={busy || authLoading} aria-busy={busy}>{busy ? 'Creating your account…' : 'Create account'} {!busy && <ArrowRight size={17} />}</Button>
    </form>
    <GoogleAuthButton />
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    <div className="auth-security-note"><span aria-hidden="true">●</span> You’ll verify your email before using AYOS services.</div>
  </div>
}
