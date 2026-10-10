import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import FormField from '../components/auth/FormField'
import PasswordField from '../components/auth/PasswordField'
import Button from '../components/ui/Button'
export default function LoginPage() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [remember, setRemember] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice('')
    const data = new FormData(event.currentTarget), next: Record<string, string> = {}
    const email = String(data.get('email') ?? '').trim(), password = String(data.get('password') ?? '')
    if (!email) next.email = 'Enter your email address or mobile number.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/^\+?[\d\s()-]{7,}$/.test(email)) next.email = 'Enter a valid email address or mobile number.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus())
    if (!Object.keys(next).length) setNotice('Sign in isn’t connected yet. Your details were not sent.')
  }
  return <div className="auth-form-shell"><span className="auth-kicker">Welcome back</span><h1>Good to see you again.</h1><p className="auth-intro">Sign in to continue with AYOS.</p>
    <form onSubmit={submit} noValidate>
      <FormField label="Email or mobile number" name="email" type="text" autoComplete="username" inputMode="text" placeholder="you@example.com" error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password" error={errors.password} />
      <div className="form-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> <span>Remember me</span></label><button className="quiet-link" type="button" onClick={() => setNotice('Password recovery will be available when AYOS authentication is connected.')}>Forgot password?</button></div>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <Button type="submit" className="form-submit">Sign in <ArrowRight size={17} /></Button>
    </form>
    <p className="auth-switch">New to AYOS? <Link to="/signup">Create an account</Link></p>
    <div className="auth-security-note"><span aria-hidden="true">●</span> Secure sign-in and account recovery are coming soon.</div>
  </div>
}
