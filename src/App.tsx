import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import RequireAuth from './components/auth/RequireAuth'

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
const ProfilePage = lazy(() => import('./features/account/ProfilePage'))
const SavedLocationsPage = lazy(() => import('./features/account/SavedLocationsPage'))
const ProviderApplyPage = lazy(() => import('./features/account/ProviderApplyPage'))
const routeFallback = <div className="route-loading" role="status">Loading AYOS…</div>

export default function App() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Suspense fallback={routeFallback}><LandingPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={routeFallback}><LegalPreviewPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={routeFallback}><LegalPreviewPage /></Suspense>} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Suspense fallback={routeFallback}><LoginPage /></Suspense>} />
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
          <Route path="/account" element={<Navigate to="/home" replace />} />
          <Route path="/account/profile" element={<Suspense fallback={routeFallback}><ProfilePage /></Suspense>} />
          <Route path="/account/locations" element={<Suspense fallback={routeFallback}><SavedLocationsPage /></Suspense>} />
          <Route path="/account/address" element={<Suspense fallback={routeFallback}><AddressSetupPage /></Suspense>} />
          <Route path="/provider/apply" element={<Suspense fallback={routeFallback}><ProviderApplyPage /></Suspense>} />
        </Route>
        <Route path="/account/security" element={<Suspense fallback={routeFallback}><AccountSecurityPage /></Suspense>} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
