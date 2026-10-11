import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import FormField from '../components/auth/FormField'
import Button from '../components/ui/Button'
import { authRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

export default function MfaChallengePage() {
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBusy(true)
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    try {
      await authRequest('/two-factor-challenge', { method: 'POST', body: JSON.stringify(recovery ? { recovery_code: code } : { code }) })
      const user = await refreshUser()
      navigate(user && !user.email_verified
        ? '/verify-email'
        : user && !user.address_complete
          ? '/account/address'
          : '/account', { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'That code didn’t work. Check it and try again.') }
    finally { setBusy(false) }
  }
  return <div className="auth-form-shell"><span className="auth-kicker">One more check</span><h1>Confirm it’s you.</h1><p className="auth-intro">{recovery ? 'Enter one of your saved recovery codes.' : 'Enter the six-digit code from your authenticator app.'}</p>
    <div className="verify-email-mark"><ShieldCheck size={26} aria-hidden="true" /></div>
    <form onSubmit={submit} noValidate><FormField label={recovery ? 'Recovery code' : 'Authenticator code'} name="code" autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} placeholder={recovery ? 'Enter a recovery code' : '000000'} error={error} /><Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Continue'} {!busy && <ArrowRight size={17} />}</Button></form>
    <p className="auth-switch"><button type="button" className="quiet-link" onClick={() => { setRecovery(!recovery); setError('') }}>{recovery ? 'Use authenticator code' : 'Use a recovery code'}</button></p>
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </div>
}
