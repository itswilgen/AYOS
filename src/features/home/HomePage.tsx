import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import HomeSearch from './components/HomeSearch'
import ServiceCategories from './components/ServiceCategories'
import ProviderShowcase from './components/ProviderShowcase'
import { useAuth } from '../../lib/auth/useAuth'
import { locationsService } from '../../services/locations.service'
import { servicesService } from '../../services/home.service'
import type { ServiceCategory, ServiceLocationSummary } from '../../types/marketplace'

export default function HomePage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHome = useCallback(async () => {
    const [categoryResult, locationResult] = await Promise.allSettled([
      servicesService.getCategories(),
      locationsService.getSavedLocations(),
    ])
    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    if (locationResult.status === 'fulfilled') setLocations(locationResult.value)
    setError(categoryResult.status === 'rejected' ? 'Services could not load. You can retry without losing your account details.' : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      servicesService.getCategories(),
      locationsService.getSavedLocations(),
    ]).then(([categoryResult, locationResult]) => {
      if (!active) return
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
      if (locationResult.status === 'fulfilled') setLocations(locationResult.value)
      setError(categoryResult.status === 'rejected' ? 'Services could not load. You can retry without losing your account details.' : '')
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
    {!loading && categories.length > 0 && <ProviderShowcase />}
  </div>
}
