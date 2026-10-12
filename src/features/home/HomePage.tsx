import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react'
import HomeSearch from './components/HomeSearch'
import ProviderPreview from './components/ProviderPreview'
import RequestActivity from './components/RequestActivity'
import ServiceCategories from './components/ServiceCategories'
import { useAuth } from '../../lib/auth/useAuth'
import { locationsService } from '../../services/locations.service'
import { providersService, requestsService, servicesService } from '../../services/home.service'
import type { ProviderSummary, ServiceCategory, ServiceLocationSummary, ServiceRequestSummary } from '../../types/marketplace'

export default function HomePage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [requests, setRequests] = useState<ServiceRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationError, setLocationError] = useState('')

  const loadHome = useCallback(async () => {
    const [categoryResult, providerResult, locationResult, requestResult] = await Promise.allSettled([
      servicesService.getCategories(),
      providersService.getFeaturedProviders(),
      locationsService.getSavedLocations(),
      requestsService.getActiveRequests(),
    ])
    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    if (providerResult.status === 'fulfilled') setProviders(providerResult.value)
    if (locationResult.status === 'fulfilled') setLocations(locationResult.value)
    if (requestResult.status === 'fulfilled') setRequests(requestResult.value)
    setLocationError(locationResult.status === 'rejected' ? 'Your saved service area could not load.' : '')
    const errors = [categoryResult, providerResult, requestResult].filter((result) => result.status === 'rejected')
    setError(errors.length ? 'Some AYOS content could not load. You can retry without losing your account details.' : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      servicesService.getCategories(),
      providersService.getFeaturedProviders(),
      locationsService.getSavedLocations(),
      requestsService.getActiveRequests(),
    ]).then(([categoryResult, providerResult, locationResult, requestResult]) => {
      if (!active) return
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
      if (providerResult.status === 'fulfilled') setProviders(providerResult.value)
      if (locationResult.status === 'fulfilled') setLocations(locationResult.value)
      if (requestResult.status === 'fulfilled') setRequests(requestResult.value)
      setLocationError(locationResult.status === 'rejected' ? 'Your saved service area could not load.' : '')
      const errors = [categoryResult, providerResult, requestResult].filter((result) => result.status === 'rejected')
      setError(errors.length ? 'Some AYOS content could not load. You can retry without losing your account details.' : '')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const defaultLocation = locations.find((location) => location.is_default) ?? locations[0]
  const areaLabel = defaultLocation
    ? `${defaultLocation.city_municipality.name}, ${defaultLocation.province?.name ?? defaultLocation.region.name}`
    : ''
  const greetingName = user?.name.trim().split(/\s+/)[0] || 'there'

  return <div className="app-page home-page">
    {error && <div className="app-load-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void loadHome() }} disabled={loading}>{loading ? 'Loading…' : 'Try again'}</button></div>}
    <div className="home-greeting"><div><span className="home-eyebrow">GOOD TO HAVE YOU HERE</span><h2>Hi, {greetingName}.</h2><p>{areaLabel ? `Ready to find local help in ${areaLabel}?` : 'Find a trusted local service whenever you need one.'}</p></div><Link to="/account/locations" className="home-greeting-location"><MapPin size={17} aria-hidden="true" /><span>{areaLabel || 'Add your service area'}</span><ArrowRight size={15} aria-hidden="true" /></Link></div>

    <div className="home-marketplace-feature">
      <HomeSearch categories={categories} locations={locations} />
      {loading ? <div className="home-categories-loading" role="status">Loading services…</div> : categories.length ? <ServiceCategories categories={categories} /> : <section className="home-section-error"><h2>Services are temporarily unavailable</h2><p>We couldn’t load service categories just now.</p><button type="button" onClick={() => { setLoading(true); void loadHome() }}>Try again</button></section>}
    </div>

    <div className="home-content-grid">
      <div className="home-content-main">
        {loading ? <div className="home-section-loading" role="status">Loading provider examples…</div> : <ProviderPreview providers={providers} />}
        {loading ? <div className="home-section-loading" role="status">Checking service activity…</div> : <RequestActivity requests={requests} />}
      </div>

      <aside className="home-side-column" aria-label="Account shortcuts">
        <section className="home-location-card">
          <div className="home-side-heading"><span className="home-side-icon"><MapPin size={19} aria-hidden="true" /></span><div><span className="home-eyebrow">SERVICE AREA</span><h2>Your location</h2></div></div>
          {locationError ? <div className="home-location-empty" role="alert"><strong>Location unavailable</strong><p>{locationError}</p><button type="button" onClick={() => { setLoading(true); void loadHome() }} disabled={loading}>{loading ? 'Loading…' : 'Try again'}</button></div> : defaultLocation ? <>
            <span className="home-location-label">{defaultLocation.label}</span>
            <strong className="home-location-city">{areaLabel}</strong>
            <span className="home-location-barangay">{defaultLocation.barangay.name}</span>
          </> : <div className="home-location-empty"><strong>Add a service location</strong><p>Choose the area where you’d like to find help.</p></div>}
          <Link to="/account/locations" className="home-location-link">{defaultLocation ? 'Manage locations' : 'Add location'} <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>

        <section className="home-account-shortcuts">
          <span className="home-eyebrow">ACCOUNT</span>
          <Link to="/account/profile"><span><strong>Personal details</strong><small>Name, email and mobile</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/account/security"><span><strong>Sign-in &amp; security</strong><small>Password and active sessions</small></span><ShieldCheck size={17} aria-hidden="true" /></Link>
        </section>

        <section className="home-provider-cta">
          <span className="home-eyebrow">FOR SKILLED LOCALS</span>
          <h2>Have a skill to share?</h2>
          <p>Learn how you can prepare to offer services through AYOS.</p>
          <Link to="/provider/apply">Become a provider <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <p className="home-data-note">Provider and request previews use sample data while AYOS’s marketplace APIs are being connected.</p>
      </aside>
    </div>
  </div>
}
