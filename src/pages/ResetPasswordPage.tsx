import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PasswordField from '../components/auth/PasswordField'
import Button from '../components/ui/Button'
import { ApiError, authRequest } from '../lib/api/client'

function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null || !('errors' in error.details)) return {}
  const errors = error.details.errors
  return typeof errors === 'object' && errors !== null ? Object.fromEntries(Object.entries(errors).map(([key, value]) => [key === 'password_confirmation' ? 'confirm' : key, Array.isArray(value) ? String(value[0]) : 'Check this field.'])) : {}
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({}); setMessage('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')
    const next: Record<string, string> = {}
    if (password.length < 12) next.password = 'Use at least 12 characters.'
    if (password !== confirm) next.confirm = 'Your passwords don’t match.'
    if (Object.keys(next).length) { setErrors(next); return }
    setBusy(true)
    try {
      await authRequest('/reset-password', { method: 'POST', body: JSON.stringify({ email: params.get('email'), token: params.get('token'), password, password_confirmation: confirm }) })
      setMessage('Your password is updated. You can now sign in.')
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) {
      const serverErrors = getFieldErrors(error)
      setErrors(serverErrors)
      setMessage(Object.keys(serverErrors).length ? '' : error instanceof Error ? error.message : 'This reset link is invalid or has expired.')
    } finally { setBusy(false) }
  }
  return <div className="auth-form-shell"><span className="auth-kicker">Choose a new password</span><h1>Make it a strong one.</h1><p className="auth-intro">Use a passphrase that’s unique to your AYOS account.</p>
    <form onSubmit={submit} noValidate><PasswordField label="New password" name="password" autoComplete="new-password" placeholder="At least 12 characters" hint="Long passphrases are easier to remember and harder to guess." error={errors.password} /><PasswordField label="Confirm password" name="confirm" autoComplete="new-password" placeholder="Enter it again" error={errors.confirm} />
      {message && <p className="form-notice" role={Object.keys(errors).length ? 'alert' : 'status'}>{message}</p>}
      <Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'} {!busy && <ArrowRight size={17} />}</Button>
    </form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </div>
}
