import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import RequireAuth from './components/auth/RequireAuth'
import RequireAdmin from './components/auth/RequireAdmin'
import * as ProviderPages from './features/provider/ProviderPages'
import { apiRequest } from './lib/api/client'
import { useAuth } from './lib/auth/useAuth'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const GoogleCompletePage = lazy(() => import('./pages/GoogleCompletePage'))
const LegalPreviewPage = lazy(() => import('./pages/LegalPreviewPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const MfaChallengePage = lazy(() => import('./pages/MfaChallengePage'))
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'))
const AddressSetupPage = lazy(() => import('./pages/AddressSetupPage'))
const HomePage = lazy(() => import('./features/home/HomePage'))
const SearchResultsPage = lazy(() => import('./features/services/SearchResultsPage'))
const CustomerRequestPage = lazy(() => import('./features/services/CustomerRequestPage'))
const ProviderProfilePage = lazy(() => import('./features/services/ProviderProfilePage'))
const MessagesPage = lazy(() => import('./features/messages/MessagesPage'))
const MyRequestsPage = lazy(() => import('./features/services/MyRequestsPage'))
const ProfilePage = lazy(() => import('./features/account/ProfilePage'))
const SavedLocationsPage = lazy(() => import('./features/account/SavedLocationsPage'))
const ProviderApplyPage = lazy(() => import('./features/account/ProviderApplyPage'))
const ProviderLayout = lazy(() => import('./features/provider/ProviderLayout'))
const AdminPage = lazy(() => import('./features/admin/AdminPage'))
const routeFallback = <div className="route-loading" role="status">Loading AYOS…</div>

function PlatformGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user } = useAuth()
  const [maintenance, setMaintenance] = useState(false)
  const adminPath = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (adminPath) return
    let active = true
    apiRequest<{ maintenance_mode: boolean }>('/platform-state')
      .then((state) => { if (active) setMaintenance(state.maintenance_mode) })
      .catch(() => { if (active) setMaintenance(false) })
    return () => { active = false }
  }, [adminPath])

  if (!adminPath && maintenance) return <main className="platform-maintenance"><div><span>AYOS SERVICE UPDATE</span><h1>We’ll be back soon.</h1><p>AYOS is temporarily unavailable while we improve the marketplace. Please check back shortly.</p><a href="mailto:hello@ayos.ph">Contact support</a></div></main>
  if (!adminPath && user?.account_status === 'suspended') return <main className="platform-maintenance"><div><span>ACCOUNT ACCESS</span><h1>Your account is suspended.</h1><p>Contact AYOS support if you need help reviewing this account status.</p><a href="mailto:hello@ayos.ph">Contact support</a></div></main>
  return <>{children}</>
}

export default function App() {
  return <PlatformGate><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Suspense fallback={routeFallback}><LandingPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={routeFallback}><LegalPreviewPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={routeFallback}><LegalPreviewPage /></Suspense>} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Suspense fallback={routeFallback}><LoginPage /></Suspense>} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<Suspense fallback={routeFallback}><SignupPage /></Suspense>} />
      <Route path="/google/complete" element={<Suspense fallback={routeFallback}><GoogleCompletePage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={routeFallback}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={routeFallback}><ResetPasswordPage /></Suspense>} />
      <Route path="/verify-email" element={<Suspense fallback={routeFallback}><VerifyEmailPage /></Suspense>} />
      <Route path="/mfa/challenge" element={<Suspense fallback={routeFallback}><MfaChallengePage /></Suspense>} />
    </Route>
    <Route element={<RequireAuth />}>
      <Route element={<AuthenticatedLayout />}>
        <Route element={<RequireAuth verified />}>
          <Route path="/home" element={<Suspense fallback={routeFallback}><HomePage /></Suspense>} />
          <Route path="/services/search" element={<Suspense fallback={routeFallback}><SearchResultsPage /></Suspense>} />
          <Route path="/services/request/:providerId" element={<Suspense fallback={routeFallback}><CustomerRequestPage /></Suspense>} />
          <Route path="/providers/:providerId" element={<Suspense fallback={routeFallback}><ProviderProfilePage /></Suspense>} />
          <Route path="/messages" element={<Suspense fallback={routeFallback}><MessagesPage side="customer" /></Suspense>} />
          <Route path="/messages/:conversationId" element={<Suspense fallback={routeFallback}><MessagesPage side="customer" /></Suspense>} />
          <Route path="/my-requests" element={<Suspense fallback={routeFallback}><MyRequestsPage /></Suspense>} />
          <Route path="/account" element={<Navigate to="/home" replace />} />
          <Route path="/account/profile" element={<Suspense fallback={routeFallback}><ProfilePage /></Suspense>} />
          <Route path="/account/locations" element={<Suspense fallback={routeFallback}><SavedLocationsPage /></Suspense>} />
          <Route path="/account/address" element={<Suspense fallback={routeFallback}><AddressSetupPage /></Suspense>} />
          <Route path="/provider/apply" element={<Suspense fallback={routeFallback}><ProviderApplyPage /></Suspense>} />
        </Route>
        <Route path="/account/security" element={<Suspense fallback={routeFallback}><AccountSecurityPage /></Suspense>} />
      </Route>
      <Route element={<RequireAuth verified />}>
        <Route path="/provider" element={<Suspense fallback={routeFallback}><ProviderLayout /></Suspense>}>
          <Route index element={<ProviderPages.ProviderOverview />} />
          <Route path="requests" element={<ProviderPages.ProviderRequests />} />
          <Route path="requests/:id" element={<ProviderPages.ProviderRequestDetails />} />
          <Route path="messages" element={<Suspense fallback={routeFallback}><MessagesPage side="provider" /></Suspense>} />
          <Route path="messages/:conversationId" element={<Suspense fallback={routeFallback}><MessagesPage side="provider" /></Suspense>} />
          <Route path="jobs" element={<ProviderPages.ProviderJobs />} />
          <Route path="jobs/:id" element={<ProviderPages.ProviderJobDetails />} />
          <Route path="schedule" element={<ProviderPages.ProviderSchedule />} />
          <Route path="services" element={<ProviderPages.ProviderServices />} />
          <Route path="service-areas" element={<ProviderPages.ProviderAreas />} />
          <Route path="reviews" element={<ProviderPages.ProviderReviews />} />
          <Route path="profile" element={<ProviderPages.ProviderProfilePage />} />
          <Route path="access" element={<ProviderPages.ProviderAccessPage />} />
          <Route path="notifications" element={<ProviderPages.ProviderNotifications />} />
        </Route>
      </Route>
    </Route>
    <Route element={<RequireAdmin />}>
      <Route path="/admin/*" element={<Suspense fallback={routeFallback}><AdminPage /></Suspense>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></PlatformGate>
}
