import Hero from '../components/landing/Hero'
import ServicesSection from '../components/landing/ServicesSection'
import HowItWorks from '../components/landing/HowItWorks'
import TrustSection from '../components/landing/TrustSection'
import LocationSection from '../components/landing/LocationSection'
import ProviderSection from '../components/landing/ProviderSection'
import FinalCta from '../components/landing/FinalCta'
import { usePageMotion } from '../animations/usePageMotion'
export default function LandingPage() {
  usePageMotion()
  return <main id="main-content"><Hero /><ServicesSection /><HowItWorks /><TrustSection /><LocationSection /><ProviderSection /><FinalCta /></main>
}
