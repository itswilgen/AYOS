import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/auth/useAuth'

export default function RequireAdmin() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="route-loading" role="status">Checking secure administrator access…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user.admin_access) return <div className="admin-access-denied"><ShieldCheck aria-hidden="true" /><h1>Administrator access required</h1><p>This account does not have an AYOS admin role.</p><Link to="/home">Return to AYOS</Link></div>
  if (!user.email_verified) return <div className="admin-access-denied"><h1>Verify your email</h1><p>Administrator accounts need a verified email address.</p><Link to="/verify-email">Continue to verification</Link></div>
  if (user.account_status === 'suspended') return <div className="admin-access-denied"><h1>Account suspended</h1><p>Contact another AYOS administrator to restore this account.</p></div>
  return <Outlet />
}
