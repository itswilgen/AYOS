import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import FormField from '../components/auth/FormField'
import Button from '../components/ui/Button'
import { authRequest } from '../lib/api/client'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true); setMessage(''); setError('')
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!email) { setError('Enter the email address on your AYOS account.'); setBusy(false); return }
    try {
      await authRequest('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setMessage('If an AYOS account uses that email, we’ll send a password reset link shortly.')
    } catch {
      setMessage('If an AYOS account uses that email, we’ll send a password reset link shortly.')
    } finally { setBusy(false) }
  }
  return <div className="auth-form-shell"><span className="auth-kicker">A quick reset</span><h1>Let’s get you back in.</h1><p className="auth-intro">Enter your account email and we’ll send a secure link if it matches an AYOS account.</p>
    <form onSubmit={submit} noValidate><FormField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" startAdornment={<Mail size={18} />} error={error} />
      {message && <p className="form-notice" role="status">{message}</p>}
      <Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'} {!busy && <ArrowRight size={17} />}</Button>
    </form>
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </div>
}
