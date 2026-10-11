import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/useAuth'

export default function RequireAuth({ verified = false }: { verified?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="route-loading" role="status">Checking your AYOS session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (verified && !user.email_verified) return <Navigate to="/verify-email" replace />
  return <Outlet />
}
