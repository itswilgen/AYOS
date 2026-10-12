import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleUserRound, ShieldCheck } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { profileService } from '../../services/profile.service'
import { useAuth } from '../../lib/auth/useAuth'
import type { AccountProfile } from '../../types/marketplace'

export default function ProfilePage() {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      const result = await profileService.getProfile()
      setProfile(result)
      setName(result.name)
      setDisplayName(result.display_name ?? '')
    } catch {
      setError('We couldn’t load your profile. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void profileService.getProfile().then((result) => {
      if (!active) return
      setProfile(result)
      setName(result.name)
      setDisplayName(result.display_name ?? '')
    }).catch(() => {
      if (active) setError('We couldn’t load your profile. Check your connection and try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await profileService.updateProfile({ name: name.trim(), display_name: displayName.trim() || null })
      setProfile(updated)
      setName(updated.name)
      setDisplayName(updated.display_name ?? '')
      await refreshUser()
      setSuccess('Your profile has been updated.')
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) {
        setError('Please check your name and try again.')
      } else {
        setError(reason instanceof Error ? reason.message : 'We couldn’t save your changes. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="app-page account-page-loading" role="status">Loading your profile…</div>

  return <div className="app-page account-page">
    <div className="account-page-heading"><div><span className="home-eyebrow">YOUR AYOS ACCOUNT</span><h1>Personal details</h1><p>Keep your contact information up to date.</p></div><span className="account-page-avatar"><CircleUserRound size={29} aria-hidden="true" /></span></div>
    <div className="account-page-grid">
      <nav className="account-nav-rail" aria-label="Account settings">
        <Link className="is-current" to="/account/profile">Personal details</Link>
        <Link to="/account/locations">Saved locations</Link>
        <Link to="/account/security">Sign-in &amp; security</Link>
      </nav>
      <section className="account-panel" aria-labelledby="profile-form-title">
        <div className="account-panel-heading"><div><h2 id="profile-form-title">Profile information</h2><p>These details are connected to your AYOS account.</p></div></div>
        {error && <p className="app-form-alert" role="alert">{error}<button type="button" onClick={() => { setLoading(true); setError(''); void loadProfile() }}>Try again</button></p>}
        {success && <p className="app-form-success" role="status"><Check size={16} aria-hidden="true" /> {success}</p>}
        {profile && <form className="account-profile-form" onSubmit={save}>
          <label className="app-form-field" htmlFor="profile-name"><span>Full name</span><input id="profile-name" name="name" autoComplete="name" required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="app-form-field" htmlFor="profile-display-name"><span>Display name <small>Optional</small></span><input id="profile-display-name" name="display_name" autoComplete="nickname" maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How you’d like to be known" /></label>
          <label className="app-form-field" htmlFor="profile-email"><span>Email address</span><input id="profile-email" type="email" value={profile.email} readOnly aria-describedby="profile-email-status" /><small id="profile-email-status" className={profile.email_verified ? 'profile-verification is-verified' : 'profile-verification'}>{profile.email_verified ? 'Verified email' : 'Email not verified'}</small></label>
          <label className="app-form-field" htmlFor="profile-mobile"><span>Mobile number</span><input id="profile-mobile" type="tel" value={profile.mobile_number} readOnly /></label>
          <div className="account-form-actions"><button className="button button-primary" type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving changes…' : 'Save changes'} {!saving && <ArrowRight size={16} aria-hidden="true" />}</button><span>Account contact details are managed securely.</span></div>
        </form>}
      </section>
    </div>
    <p className="account-page-security-note"><ShieldCheck size={17} aria-hidden="true" /> Keep your sign-in details safe. <Link to="/account/security">Review security settings <ArrowRight size={15} aria-hidden="true" /></Link></p>
  </div>
}
