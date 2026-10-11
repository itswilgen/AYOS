import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import FormField from '../components/auth/FormField'
import Button from '../components/ui/Button'
import { ApiError, authRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

type GoogleProfile = { name: string; email: string }

export default function GoogleCompletePage() {
  const [profile, setProfile] = useState<GoogleProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [mobileError, setMobileError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    let active = true
    authRequest<GoogleProfile>('/auth/google/pending')
      .then((result) => { if (active) setProfile(result) })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : 'Your Google sign-up has expired. Please start again.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    setMobileError('')
    const mobile = String(new FormData(event.currentTarget).get('mobile_number') ?? '').trim()
    if (!/^\+?[\d\s().-]{7,32}$/.test(mobile)) {
      setMobileError('Enter a valid mobile number so providers can reach you.')
      return
    }
    if (!accepted) {
      setNotice('Please agree to the Terms and Privacy Policy to create your AYOS account.')
      return
    }

    setBusy(true)
    try {
      await authRequest('/auth/google/complete', {
        method: 'POST',
        body: JSON.stringify({ mobile_number: mobile, terms_accepted: accepted }),
      })
      await refreshUser()
      navigate('/account/address', { replace: true })
    } catch (error) {
      const errors = error instanceof ApiError && typeof error.details === 'object' && error.details !== null && 'errors' in error.details
        ? error.details.errors
        : null
      if (typeof errors === 'object' && errors !== null && 'mobile_number' in errors) {
        const value = errors.mobile_number
        setMobileError(Array.isArray(value) ? String(value[0]) : 'Enter a valid mobile number.')
      } else {
        setNotice(error instanceof Error ? error.message : 'We couldn’t finish creating your account. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="route-loading" role="status">Finishing your Google sign-up…</div>

  return <div className="auth-form-shell google-complete-shell">
    <span className="auth-kicker">One last detail</span>
    <h1>Let’s finish your account.</h1>
    <p className="auth-intro">Your Google email is verified. Add a mobile number so local providers can reach you, then you’ll add your service address.</p>
    {profile ? <>
      <div className="google-profile-summary"><span>GOOGLE ACCOUNT</span><strong>{profile.name}</strong><small>{profile.email}</small></div>
      <form onSubmit={submit} noValidate>
        <FormField label="Mobile number" name="mobile_number" type="tel" autoComplete="tel" inputMode="tel" placeholder="+63 9XX XXX XXXX" hint="Use the number where a provider can reach you." error={mobileError} />
        <div className="terms-row"><label className="check-label"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I agree to AYOS’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label></div>
        {notice && <p className="form-notice" role="alert">{notice}</p>}
        <Button className="form-submit" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Creating your account…' : 'Continue'} {!busy && <ArrowRight size={17} />}</Button>
      </form>
    </> : <>
      <p className="form-notice" role="alert">{notice || 'This Google sign-up has expired. Please start again.'}</p>
      <Link className="google-restart-link" to="/signup">Return to sign up</Link>
    </>}
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </div>
}
