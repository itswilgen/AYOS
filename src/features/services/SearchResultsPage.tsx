import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, MapPin, Search, Star } from 'lucide-react'
import { locationsService } from '../../services/locations.service'
import { providersService } from '../../services/home.service'
import type { ProviderSummary, ServiceLocationSummary } from '../../types/marketplace'

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('service') ?? '')
  const [locationId, setLocationId] = useState(params.get('locationId') ?? '')
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [error, setError] = useState('')
  const serviceQuery = params.get('service')?.trim() ?? ''
  const selectedLocation = locations.find((location) => String(location.id) === locationId)
  const locationLabel = selectedLocation
    ? `${selectedLocation.city_municipality.name}, ${selectedLocation.province?.name ?? selectedLocation.region.name}`
    : params.get('location') ?? ''

  useEffect(() => {
    let active = true
    void locationsService.getSavedLocations().then((saved) => {
      if (!active) return
      setLocations(saved)
      if (!params.get('locationId')) {
        const preferred = saved.find((item) => item.is_default) ?? saved[0]
        if (preferred) setLocationId(String(preferred.id))
      }
    }).catch(() => {
      if (active) setError('We couldn’t load your saved service areas. Manage locations and try again.')
    }).finally(() => { if (active) setLocationsLoading(false) })
    return () => { active = false }
  }, [params])

  const loadResults = useCallback(async (term: string, currentLocationId: string, saved: ServiceLocationSummary[]) => {
    if (!term) { setProviders([]); setLoading(false); return }
    setLoading(true)
    setError('')
    const currentLocation = saved.find((location) => String(location.id) === currentLocationId)
    const area = currentLocation
      ? `${currentLocation.city_municipality.name}, ${currentLocation.province?.name ?? currentLocation.region.name}`
      : params.get('location') ?? undefined
    try {
      setProviders(await providersService.searchProviders({ query: term, locationId: currentLocation?.id, locationLabel: area, cityCode: currentLocation?.city_municipality.code }))
    } catch {
      setError('We couldn’t search service providers right now. Please try again.')
    } finally { setLoading(false) }
  }, [params])

  useEffect(() => {
    if (locationsLoading) return
    let active = true
    const currentLocation = locations.find((location) => String(location.id) === locationId)
    const area = currentLocation
      ? `${currentLocation.city_municipality.name}, ${currentLocation.province?.name ?? currentLocation.region.name}`
      : params.get('location') ?? undefined
    void providersService.searchProviders({ query: serviceQuery, locationId: currentLocation?.id, locationLabel: area, cityCode: currentLocation?.city_municipality.code }).then((results) => {
      if (active) setProviders(results)
    }).catch(() => {
      if (active) setError('We couldn’t search service providers right now. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [locationId, locations, locationsLoading, params, serviceQuery])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = new URLSearchParams()
    if (query.trim()) next.set('service', query.trim())
    if (locationId) {
      next.set('locationId', locationId)
      next.set('location', locationLabel)
    }
    setParams(next)
  }

  const pickLocation = (id: string) => {
    setLocationId(id)
    const next = new URLSearchParams(params)
    const item = locations.find((location) => String(location.id) === id)
    if (item) {
      next.set('locationId', id)
      next.set('location', `${item.city_municipality.name}, ${item.province?.name ?? item.region.name}`)
    } else {
      next.delete('locationId')
      next.delete('location')
    }
    setParams(next)
  }

  return <div className="app-page search-results-page">
    <Link className="account-back-link" to="/home"><ArrowLeft size={16} aria-hidden="true" /> AYOS home</Link>
    <div className="search-results-heading"><span className="home-eyebrow">FIND LOCAL SKILLS</span><h1>Service search</h1><p>Choose a service and area to explore the AYOS marketplace.</p></div>
    <form className="search-results-form" onSubmit={submit}>
      <label className="search-results-query"><span className="sr-only">Service</span><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What service do you need?" /></label>
      <label className="search-results-location"><MapPin size={18} aria-hidden="true" /><span className="sr-only">Service location</span><select value={locationId} onChange={(event) => pickLocation(event.target.value)} disabled={locationsLoading}><option value="">Choose a saved location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.label} · {location.city_municipality.name}</option>)}</select></label>
      <button className="home-search-submit" type="submit" disabled={!query.trim()}><Search size={17} aria-hidden="true" /><span>Search</span><ArrowRight size={16} aria-hidden="true" /></button>
    </form>
    {!locationsLoading && !locations.length && <div className="search-location-prompt"><MapPin size={18} aria-hidden="true" /><p>Add a saved location to find providers for your service area.</p><Link to="/account/locations">Manage locations <ArrowRight size={15} aria-hidden="true" /></Link></div>}
    <div className="search-results-title"><div><h2>{serviceQuery ? `Results for “${serviceQuery}”` : 'Choose a service to get started'}</h2>{locationLabel && <p><MapPin size={15} aria-hidden="true" /> {locationLabel}</p>}</div></div>
    {error && <div className="app-load-error" role="alert"><p>{error}</p><button type="button" onClick={() => void loadResults(serviceQuery, locationId, locations)}>Try again</button></div>}
    {loading ? <div className="search-loading" role="status">Searching local providers…</div> : providers.length ? <div className="search-provider-list">{providers.map((provider) => <article className="search-provider-item" key={provider.id}>
      <span className="provider-avatar" aria-hidden="true">{provider.initials}</span><div className="search-provider-main"><h3>{provider.displayName}</h3><p>{provider.specialties.join(' · ')}</p><span className="provider-location"><MapPin size={14} aria-hidden="true" /> {provider.serviceAreaLabel}</span><div className="provider-meta">{provider.rating !== null && <span><Star size={14} fill="currentColor" aria-hidden="true" /> {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)</span>}<span><BadgeCheck size={14} aria-hidden="true" /> {provider.verificationStatus === 'verified' ? 'Identity checked' : 'Not yet checked'}</span></div><Link className="provider-text-link" to={`/providers/${provider.id}`}>View profile and message <ArrowRight size={16} /></Link></div>
    </article>)}</div> : serviceQuery && !error ? <div className="search-no-results"><span><Search size={20} aria-hidden="true" /></span><h3>No providers match this search</h3><p>Try a different service or location, or browse all categories.</p><Link to="/home#services">Browse services <ArrowRight size={15} aria-hidden="true" /></Link></div> : null}
  </div>
}
