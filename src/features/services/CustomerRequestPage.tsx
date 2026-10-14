import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api/client'
import { locationsService } from '../../services/locations.service'
import { providersService, servicesService } from '../../services/home.service'
import type { ProviderSummary, ServiceCategory, ServiceLocationSummary } from '../../types/marketplace'
import '../provider/provider.css'

export default function CustomerRequestPage() {
  const { providerId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [provider, setProvider] = useState<ProviderSummary | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [category, setCategory] = useState('')
  const [locationId, setLocationId] = useState(params.get('locationId') ?? '')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [preferredAt, setPreferredAt] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([providersService.getProvider(providerId ?? ''), servicesService.getCategories(), locationsService.getSavedLocations()]).then(([found, items, saved]) => {
      if (!active) return
      setProvider(found)
      setCategories(items)
      setLocations(saved)
      setLocationId((current) => current || String(saved.find((item) => item.is_default)?.id ?? saved[0]?.id ?? ''))
      const requested = params.get('service')?.toLowerCase()
      setCategory(items.find((item) => found?.specialties.includes(item.name) && item.name.toLowerCase() === requested)?.slug ?? items.find((item) => found?.specialties.includes(item.name))?.slug ?? '')
    }).catch(() => { if (active) setError('We couldn’t load this provider. Please try again.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [providerId, params])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!providerId) return
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.set('providerId', providerId)
      body.set('category', category)
      body.set('serviceLocationId', locationId)
      body.set('description', description)
      body.set('notes', notes)
      body.set('preferredAt', new Date(preferredAt).toISOString())
      photos.forEach((photo) => body.append('photos[]', photo))
      await apiRequest('/customer/requests', { method: 'POST', body })
      navigate('/my-requests', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t send your request.') }
    finally { setBusy(false) }
  }
  return <main className="app-page"><Link className="account-back-link" to="/services/search">← Back to providers</Link><div className="search-results-heading"><span className="home-eyebrow">REQUEST LOCAL HELP</span><h1>Request a service</h1><p>{provider ? `Tell ${provider.displayName} what you need.` : 'Tell your provider what you need.'}</p></div>{loading ? <p role="status">Loading provider…</p> : !provider ? <p role="alert">{error || 'This provider is not available for requests.'}</p> : <section className="provider-panel"><form className="provider-form" onSubmit={(event) => void submit(event)}><label>Service<select required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Choose a service</option>{categories.filter((item) => provider.specialties.includes(item.name)).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label>Service address<select required value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose a saved address</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.city_municipality.name}</option>)}</select></label>{!locations.length && <p><Link to="/account/locations?add=1">Add an address</Link> before requesting a service.</p>}<label>What needs doing?<textarea required minLength={10} maxLength={1000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Additional notes <span>Optional</span><textarea maxLength={1000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><label>Preferred date and time<input required type="datetime-local" value={preferredAt} onChange={(event) => setPreferredAt(event.target.value)} /></label><label>Photos <span>Optional, up to 5</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 5))} /></label>{error && <p className="provider-inline-warning" role="alert">{error}</p>}<button className="provider-button provider-button-primary" type="submit" disabled={busy || !locations.length}>{busy ? 'Sending…' : 'Send request'}</button></form></section>}</main>
}
