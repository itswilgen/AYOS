import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, KeyRound, Laptop, Shield, ShieldCheck, Trash2 } from 'lucide-react'
import FormField from '../components/auth/FormField'
import PasswordField from '../components/auth/PasswordField'
import Button from '../components/ui/Button'
import { apiRequest, authRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

type AccountSession = { id: string; current: boolean; device: string; ip_address: string | null; last_active_at: string }
type QrCode = { svg: string; url: string }

export default function AccountSecurityPage() {
  const { user, refreshUser } = useAuth()
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<QrCode | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [showRevokeOthers, setShowRevokeOthers] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const loadSessions = useCallback(async () => {
    try { setSessions(await apiRequest<AccountSession[]>('/account/sessions')) }
    catch { setError('We couldn’t load your active sessions. Refresh to try again.') }
  }, [])
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const current = await apiRequest<AccountSession[]>('/account/sessions')
        if (active) setSessions(current)
      } catch {
        if (active) setError('We couldn’t load your active sessions. Refresh to try again.')
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const revoke = async (id: string) => {
    setError(''); setMessage('')
    try { await apiRequest(`/account/sessions/${id}`, { method: 'DELETE' }); setSessions(current => current.filter(session => session.id !== id)); setMessage('That device has been signed out.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t sign out that device.') }
  }

  const revokeOthers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    const password = String(new FormData(event.currentTarget).get('revoke_password') ?? '')
    const form = event.currentTarget
    try {
      const result = await apiRequest<{ revoked: number }>('/account/sessions/others', { method: 'DELETE', body: JSON.stringify({ password }) })
      form.reset(); setShowRevokeOthers(false); setMessage(`${result.revoked} other ${result.revoked === 1 ? 'session was' : 'sessions were'} signed out.`); await loadSessions()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t sign out the other devices.') }
    finally { setBusy(false) }
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setPasswordErrors({}); setBusy(true)
    const data = new FormData(event.currentTarget)
    const currentPassword = String(data.get('current_password') ?? '')
    const password = String(data.get('password') ?? '')
    const confirmation = String(data.get('password_confirmation') ?? '')
    const form = event.currentTarget
    const next: Record<string, string> = {}
    if (!currentPassword) next.current_password = 'Enter your current password.'
    if (password.length < 12) next.password = 'Use at least 12 characters.'
    if (password !== confirmation) next.password_confirmation = 'Your passwords don’t match.'
    if (Object.keys(next).length) { setPasswordErrors(next); setBusy(false); return }
    try {
      const result = await apiRequest<{ message: string }>('/account/password', { method: 'PUT', body: JSON.stringify({ current_password: currentPassword, password, password_confirmation: confirmation }) })
      setMessage(result.message); form.reset(); await loadSessions()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t update your password.') }
    finally { setBusy(false) }
  }

  const enableMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    const password = String(new FormData(event.currentTarget).get('mfa_password') ?? '')
    try {
      await authRequest('/user/confirm-password', { method: 'POST', body: JSON.stringify({ password }) })
      await authRequest('/user/two-factor-authentication', { method: 'POST', body: '{}' })
      const result = await authRequest<QrCode>('/user/two-factor-qr-code')
      setQr(result)
      setMessage('Scan this QR code with an authenticator app, then enter its six-digit code to finish setup.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t start authenticator setup.') }
    finally { setBusy(false) }
  }

  const confirmMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    const code = String(new FormData(event.currentTarget).get('mfa_code') ?? '').trim()
    try {
      await authRequest('/user/confirmed-two-factor-authentication', { method: 'POST', body: JSON.stringify({ code }) })
      const codes = await authRequest<string[]>('/user/two-factor-recovery-codes')
      setRecoveryCodes(codes); setQr(null); await refreshUser()
      setMessage('Two-factor authentication is on. Save these recovery codes somewhere private.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'That code didn’t work. Check your authenticator and try again.') }
    finally { setBusy(false) }
  }

  const disableMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    const password = String(new FormData(event.currentTarget).get('disable_password') ?? '')
    const code = String(new FormData(event.currentTarget).get('disable_code') ?? '').trim()
    try {
      await authRequest('/user/confirm-password', { method: 'POST', body: JSON.stringify({ password }) })
      await authRequest('/user/two-factor-authentication', { method: 'DELETE', body: JSON.stringify({ code }) })
      await refreshUser(); setMessage('Two-factor authentication is turned off.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t turn off two-factor authentication.') }
    finally { setBusy(false) }
  }

  const loadRecoveryCodes = async () => {
    try { setRecoveryCodes(await authRequest<string[]>('/user/two-factor-recovery-codes')) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t load recovery codes.') }
  }

  const regenerateRecoveryCodes = async () => {
    setError('')
    try { await authRequest('/user/two-factor-recovery-codes', { method: 'POST', body: '{}' }); await loadRecoveryCodes(); setMessage('New recovery codes generated. Previous codes no longer work.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We couldn’t regenerate recovery codes.') }
  }

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopied(true); window.setTimeout(() => setCopied(false), 1600)
  }

  return <div className="auth-form-shell phase2-page security-page">
    <Link className="security-back" to="/account"><ArrowLeft size={16} /> Account</Link>
    <span className="auth-kicker">Take care of your account</span><h1>Sign-in &amp; security.</h1><p className="auth-intro">Update your password, add an authenticator, and review the devices signed in to AYOS.</p>
    {message && <p className="form-notice" role="status">{message}</p>}{error && <p className="form-notice security-error" role="alert">{error}</p>}

    <section className="security-section"><div className="security-section-heading"><span className="account-summary-icon"><KeyRound size={18} /></span><div><h2>Password</h2><p>Choose a unique passphrase with 12 or more characters.</p></div></div>
      <form onSubmit={updatePassword} noValidate><PasswordField label="Current password" name="current_password" autoComplete="current-password" error={passwordErrors.current_password} /><PasswordField label="New password" name="password" autoComplete="new-password" placeholder="At least 12 characters" error={passwordErrors.password} /><PasswordField label="Confirm new password" name="password_confirmation" autoComplete="new-password" error={passwordErrors.password_confirmation} /><Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button></form>
    </section>

    <section className="security-section"><div className="security-section-heading"><span className="account-summary-icon"><ShieldCheck size={18} /></span><div><h2>Two-factor authentication</h2><p>Use an authenticator app for an extra sign-in check.</p></div></div>
      {user?.mfa_enabled ? <><p className="security-enabled"><Check size={16} /> Authenticator is enabled</p>
        <div className="security-actions"><Button type="button" className="phase2-secondary" onClick={() => { void loadRecoveryCodes() }}>View recovery codes</Button><Button type="button" className="phase2-secondary" onClick={() => { void regenerateRecoveryCodes() }}>Generate new codes</Button></div>
        <form onSubmit={disableMfa}><PasswordField label="Confirm password to turn off" name="disable_password" autoComplete="current-password" /><FormField label="Current authenticator code" name="disable_code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" /><Button className="phase2-danger" type="submit" disabled={busy}>{busy ? 'Turning off…' : 'Turn off authenticator'}</Button></form>
      </> : qr ? <><img className="mfa-qr" alt="Authenticator setup QR code" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`} /><form onSubmit={confirmMfa}><FormField label="Authenticator code" name="mfa_code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" /><Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Confirm authenticator'}</Button></form></> : <form onSubmit={enableMfa}><PasswordField label="Confirm password to start setup" name="mfa_password" autoComplete="current-password" /><Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Starting…' : 'Set up authenticator'}</Button></form>}
      {recoveryCodes.length > 0 && <div className="recovery-codes"><div className="recovery-codes-head"><strong>Save your recovery codes</strong><button type="button" onClick={() => void copyCodes()} aria-label="Copy recovery codes">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button></div><ul>{recoveryCodes.map(code => <li key={code}>{code}</li>)}</ul><small>Each code can be used once. Anyone with these codes can access your account.</small></div>}
    </section>

    <section className="security-section"><div className="security-section-heading"><span className="account-summary-icon"><Laptop size={18} /></span><div><h2>Active sessions</h2><p>Devices that are currently signed in to your account.</p></div></div>
      {sessions.length ? <><ul className="session-list">{sessions.map(session => <li key={session.id}><span className="account-summary-icon"><Laptop size={18} /></span><span><strong>{session.device}{session.current ? ' · This device' : ''}</strong><small>{session.ip_address || 'IP unavailable'} · {new Date(session.last_active_at).toLocaleString()}</small></span>{!session.current && <button className="session-revoke" type="button" onClick={() => void revoke(session.id)} aria-label={`Sign out ${session.device}`}><Trash2 size={16} /> Sign out</button>}</li>)}</ul>
        {sessions.some(session => !session.current) && <>{showRevokeOthers ? <form className="revoke-sessions-form" onSubmit={revokeOthers}><PasswordField label="Confirm your password to sign out other devices" name="revoke_password" autoComplete="current-password" /><div className="security-actions"><Button className="form-submit" type="submit" disabled={busy}>{busy ? 'Signing out…' : 'Confirm sign out'}</Button><Button className="phase2-secondary" type="button" onClick={() => setShowRevokeOthers(false)}>Cancel</Button></div></form> : <Button className="phase2-secondary revoke-others-button" type="button" onClick={() => setShowRevokeOthers(true)}>Sign out all other devices</Button>}</>}
      </> : <p className="security-empty"><Shield size={16} /> No active sessions are available right now.</p>}
    </section>
    <p className="auth-switch">AYOS support will never ask you to share a password or recovery code.</p>
  </div>
}
