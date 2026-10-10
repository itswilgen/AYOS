import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const LegalPreviewPage = lazy(() => import('./pages/LegalPreviewPage'))
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
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
