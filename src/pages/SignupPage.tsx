import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import FormField from '../components/auth/FormField'
import PasswordField from '../components/auth/PasswordField'
import Button from '../components/ui/Button'
export default function SignupPage() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [accepted, setAccepted] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice('')
    const data = new FormData(event.currentTarget), next: Record<string, string> = {}
    const name = String(data.get('name') ?? '').trim(), email = String(data.get('email') ?? '').trim(), mobile = String(data.get('mobile') ?? '').trim(), password = String(data.get('password') ?? ''), confirm = String(data.get('confirm') ?? '')
    if (name.length < 2) next.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!/^\+?[\d\s()-]{7,}$/.test(mobile)) next.mobile = 'Enter a valid mobile number.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirm !== password || !confirm) next.confirm = 'Your passwords don’t match.'
    if (!accepted) next.terms = 'Please agree to the Terms and Privacy Policy to continue.'
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus())
    if (!Object.keys(next).length) setNotice('Account creation isn’t connected yet. Your details were not sent.')
  }
  return <div className="auth-form-shell signup-shell"><span className="auth-kicker">Your next step starts here</span><h1>Create your AYOS account.</h1><p className="auth-intro">One account to find help and take part in your community.</p>
    <form onSubmit={submit} noValidate>
      <FormField label="Full name" name="name" type="text" autoComplete="name" placeholder="Your full name" error={errors.name} />
      <FormField label="Email address" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" error={errors.email} />
      <FormField label="Mobile number" name="mobile" type="tel" autoComplete="tel" inputMode="tel" placeholder="+63 9XX XXX XXXX" hint="Use the number where we can reach you." error={errors.mobile} />
      <PasswordField label="Password" name="password" autoComplete="new-password" placeholder="At least 8 characters" hint="Use 8 or more characters." error={errors.password} />
      <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" placeholder="Enter your password again" error={errors.confirm} />
      <div className="terms-row"><label className="check-label"><input id="terms" type="checkbox" checked={accepted} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'terms-error' : undefined} onChange={e => setAccepted(e.target.checked)} /><span>I agree to AYOS’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>{errors.terms && <p id="terms-error" className="field-error" role="alert">{errors.terms}</p>}</div>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <Button type="submit" className="form-submit">Create account <ArrowRight size={17} /></Button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    <div className="auth-security-note"><span aria-hidden="true">●</span> Email, phone, and account security features are coming soon.</div>
  </div>
}
