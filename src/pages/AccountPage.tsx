import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, LogOut, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth/useAuth'

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const logout = async () => { await signOut(); navigate('/login', { replace: true }) }
  return <div className="auth-form-shell phase2-page"><span className="auth-kicker">Your AYOS account</span><h1>Hi, {user?.name.split(' ')[0]}.</h1><p className="auth-intro">Your account is ready. Keep your details and sign-in security up to date.</p>
    {!user?.email_verified && <div className="security-callout"><MailMark /> <div><strong>Verify your email</strong><p>Confirm your email before using AYOS services.</p><Link to="/verify-email">Continue verification <ArrowRight size={15} /></Link></div></div>}
    <div className="account-summary"><span className="account-summary-icon"><UserRound size={19} /></span><div><small>ACCOUNT EMAIL</small><strong>{user?.email}</strong></div><span className={user?.email_verified ? 'account-status is-ready' : 'account-status'}>{user?.email_verified ? 'Verified' : 'Pending'}</span></div>
    <Link className="security-link-row" to="/account/address"><span className="account-summary-icon"><MapPin size={19} /></span><span><strong>{user?.address_complete ? 'Home address' : 'Add your address'}</strong><small>{user?.address_complete ? 'Update the address where you receive services' : 'Help local providers find the right area'}</small></span><ArrowRight size={18} /></Link>
    <Link className="security-link-row" to="/account/security"><span className="account-summary-icon"><ShieldCheck size={19} /></span><span><strong>Sign-in & security</strong><small>Password, authenticator, and active sessions</small></span><ArrowRight size={18} /></Link>
    <Button className="form-submit phase2-secondary" type="button" onClick={logout}><LogOut size={17} /> Sign out</Button>
    <p className="auth-switch">AYOS accounts begin with customer access. Provider applications come later.</p>
  </div>
}

function MailMark() { return <span className="account-summary-icon"><LockKeyhole size={18} /></span> }
