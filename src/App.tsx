import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import RequireAuth from './components/auth/RequireAuth'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const LegalPreviewPage = lazy(() => import('./pages/LegalPreviewPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const MfaChallengePage = lazy(() => import('./pages/MfaChallengePage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'))
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
      <Route path="/forgot-password" element={<Suspense fallback={routeFallback}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={routeFallback}><ResetPasswordPage /></Suspense>} />
      <Route path="/verify-email" element={<Suspense fallback={routeFallback}><VerifyEmailPage /></Suspense>} />
      <Route path="/mfa/challenge" element={<Suspense fallback={routeFallback}><MfaChallengePage /></Suspense>} />
      <Route element={<RequireAuth />}>
        <Route path="/account" element={<Suspense fallback={routeFallback}><AccountPage /></Suspense>} />
        <Route path="/account/security" element={<Suspense fallback={routeFallback}><AccountSecurityPage /></Suspense>} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
