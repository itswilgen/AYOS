import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import Button from '../../components/ui/Button'
import { locationsService } from '../../services/locations.service'
import type { LocationOption, ServiceLocationInput, ServiceLocationSummary } from '../../types/marketplace'

const emptyForm: ServiceLocationInput = {
  label: '', is_default: false, region_code: '', province_code: null,
  city_municipality_code: '', barangay_code: '', address_line: '', landmark: null, postal_code: null,
}

function friendlyApiError(error: unknown, action: string): string {
  if (error instanceof ApiError && error.status === 422) return 'Check the required address details and try again.'
  return error instanceof Error ? error.message : `We couldn’t ${action}. Please try again.`
}

function errorDetails(error: unknown): string {
  if (error instanceof ApiError && typeof error.details === 'object' && error.details !== null && 'errors' in error.details) {
    const errors = error.details.errors
    if (typeof errors === 'object' && errors !== null) {
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    }
  }
  return ''
}

export default function SavedLocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [locations, setLocations] = useState<ServiceLocationSummary[]>([])
  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])
  const [form, setForm] = useState<ServiceLocationInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [barangaysLoading, setBarangaysLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [regionError, setRegionError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [success, setSuccess] = useState('')

  const loadPage = useCallback(async () => {
    const [savedResult, regionResult] = await Promise.allSettled([
      locationsService.getSavedLocations(),
      locationsService.getRegions(),
    ])
    if (savedResult.status === 'fulfilled') {
      setLocations(savedResult.value)
      setError('')
    } else {
      setError('We couldn’t load your saved locations. Check your connection and try again.')
    }
    if (regionResult.status === 'fulfilled') {
      setRegions(regionResult.value)
      setRegionError('')
    } else {
      setRegionError('Couldn’t load the geographic regions. Check your connection and try again.')
    }
    setRegionsLoading(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    const loadInitialData = async () => {
      const [savedResult, regionResult] = await Promise.allSettled([
        locationsService.getSavedLocations(),
        locationsService.getRegions(),
      ])
      if (!active) return
      if (savedResult.status === 'fulfilled') setLocations(savedResult.value)
      else setError('We couldn’t load your saved locations. Check your connection and try again.')
      if (regionResult.status === 'fulfilled') setRegions(regionResult.value)
      else setRegionError('Couldn’t load the geographic regions. Check your connection and try again.')
      setRegionsLoading(false)
      setLoading(false)
    }
    void loadInitialData()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!form.region_code) return
    let active = true
    void locationsService.getProvinces(form.region_code)
      .then((items) => { if (active) setProvinces(items) })
      .catch(() => { if (active) setFieldError('Couldn’t load provinces for that region.') })
      .finally(() => { if (active) setProvincesLoading(false) })
    return () => { active = false }
  }, [form.region_code])

  useEffect(() => {
    if (!form.region_code) return
    let active = true
    const request = form.province_code
      ? locationsService.getCities(form.province_code)
      : locationsService.getCitiesInRegion(form.region_code)
    void request
      .then((items) => { if (active) setCities(items) })
      .catch(() => { if (active) setFieldError('Couldn’t load cities for that area.') })
      .finally(() => { if (active) setCitiesLoading(false) })
    return () => { active = false }
  }, [form.region_code, form.province_code])

  useEffect(() => {
    if (!form.city_municipality_code) return
    let active = true
    void locationsService.getBarangays(form.city_municipality_code)
      .then((items) => { if (active) setBarangays(items) })
      .catch(() => { if (active) setFieldError('Couldn’t load barangays for that city.') })
      .finally(() => { if (active) setBarangaysLoading(false) })
    return () => { active = false }
  }, [form.city_municipality_code])

  const optionsLoading = regionsLoading || provincesLoading || citiesLoading || barangaysLoading

  useEffect(() => {
    if (loading || searchParams.get('add') !== '1') return
    const frame = window.requestAnimationFrame(() => {
      setFormOpen(true)
      setEditingId(null)
      setForm({ ...emptyForm, is_default: locations.length === 0 })
      setProvinces([]); setCities([]); setBarangays([])
      setProvincesLoading(false); setCitiesLoading(false); setBarangaysLoading(false)
      setFieldError('')
      setSuccess('')
      window.requestAnimationFrame(() => document.getElementById('location-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete('add')
        return next
      }, { replace: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [loading, locations.length, searchParams, setSearchParams])

  const beginAdd = () => {
    setFormOpen(true)
    setEditingId(null)
    setForm({ ...emptyForm, is_default: locations.length === 0 })
    setProvinces([]); setCities([]); setBarangays([])
    setProvincesLoading(false); setCitiesLoading(false); setBarangaysLoading(false)
    setFieldError('')
    setSuccess('')
  }

  const beginEdit = (location: ServiceLocationSummary) => {
    setFormOpen(true)
    setEditingId(location.id)
    setForm({
      label: location.label,
      is_default: location.is_default,
      region_code: location.region.code,
      province_code: location.province?.code ?? null,
      city_municipality_code: location.city_municipality.code,
      barangay_code: location.barangay.code,
      address_line: location.address_line,
      landmark: location.landmark,
      postal_code: location.postal_code,
    })
    setProvinces([]); setCities([]); setBarangays([])
    setProvincesLoading(true); setCitiesLoading(true); setBarangaysLoading(true)
    setFieldError('')
    setSuccess('')
    document.getElementById('location-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setFieldError(''); setFormOpen(false) }
  const setField = <Key extends keyof ServiceLocationInput>(key: Key, value: ServiceLocationInput[Key]) => setForm((current) => ({ ...current, [key]: value }))

  const saveLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const isEditing = editingId !== null
    const requestedDefault = isEditing ? form.is_default : locations.length === 0
    const locationInput = { ...form, is_default: requestedDefault }
    setSaving(true)
    setFieldError('')
    setError('')
    setSuccess('')
    try {
      const saved = isEditing && editingId !== null
        ? await locationsService.updateLocation(editingId, locationInput)
        : await locationsService.createLocation(locationInput)
      const isDefaultLocation = saved.is_default
      setSuccess(`${isEditing ? 'Location updated' : 'Location added'} ${isDefaultLocation ? 'as your default.' : 'as a secondary location.'}`)
      cancelEdit()
      await loadPage()
    } catch (reason) {
      setFieldError(errorDetails(reason) || friendlyApiError(reason, editingId ? 'update this location' : 'save this location'))
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (location: ServiceLocationSummary) => {
    setBusyId(location.id)
    setError('')
    setSuccess('')
    try {
      await locationsService.setDefaultLocation(location.id)
      await loadPage()
      setSuccess(`${location.label} is now your default. Other saved locations are secondary.`)
    } catch (reason) {
      setError(friendlyApiError(reason, 'change your default location'))
    } finally { setBusyId(null) }
  }

  const removeLocation = async (location: ServiceLocationSummary) => {
    if (!window.confirm(`Remove “${location.label}” from your saved locations?`)) return
    const hasDefaultReplacement = location.is_default && locations.some((item) => item.id !== location.id)
    setBusyId(location.id)
    setError('')
    setSuccess('')
    try {
      await locationsService.deleteLocation(location.id)
      await loadPage()
      setSuccess(hasDefaultReplacement ? 'Location removed. Another saved location is now your default.' : 'Location removed.')
    } catch (reason) {
      setError(friendlyApiError(reason, 'remove this location'))
    } finally { setBusyId(null) }
  }

  if (loading) return <div className="app-page account-page-loading" role="status">Loading saved locations…</div>

  return <div className="app-page account-page">
    <Link className="account-back-link" to="/home"><ArrowLeft size={16} aria-hidden="true" /> Back to AYOS home</Link>
    <div className="account-page-heading"><div><span className="home-eyebrow">MAKE LOCAL SEARCH EASIER</span><h1>Saved locations</h1><p>Save the service areas you use most. Your exact address stays private.</p></div><span className="account-page-avatar"><MapPin size={27} aria-hidden="true" /></span></div>
    <section className="account-panel" aria-labelledby={formOpen ? 'location-form-title' : 'saved-locations-title'}>
      {!formOpen && <>
        <div className="account-panel-heading"><div><h2 id="saved-locations-title">Your locations</h2><p>Choose where you’d like to find service.</p></div><Button type="button" onClick={beginAdd}><Plus size={17} aria-hidden="true" /> Add location</Button></div>
        {error && <p className="app-form-alert" role="alert">{error}<button type="button" onClick={() => { setLoading(true); setError(''); void loadPage() }}>Try again</button></p>}
        {success && <p className="app-form-success" role="status"><Check size={16} aria-hidden="true" /> {success}</p>}
        {!locations.length && !error ? <div className="locations-empty"><span><MapPin size={22} aria-hidden="true" /></span><h3>No saved locations yet</h3><p>Add an area where you’re comfortable receiving a service visit. You can change this any time.</p><Button type="button" onClick={beginAdd}><Plus size={16} aria-hidden="true" /> Add your first location</Button></div> : <ul className="saved-location-list">{locations.map((location) => {
          const area = `${location.city_municipality.name}, ${location.province?.name ?? location.region.name}`
          return <li className="saved-location-item" key={location.id}>
            <span className="saved-location-mark"><MapPin size={19} aria-hidden="true" /></span>
            <div className="saved-location-info"><div className="saved-location-title"><strong>{location.label}</strong>{location.is_default ? <span className="location-status location-status-default"><Star size={12} fill="currentColor" aria-hidden="true" /> Default</span> : <span className="location-status location-status-secondary">Secondary</span>}</div><span>{area}</span><small>{location.barangay.name}</small></div>
            <div className="saved-location-actions">
              {!location.is_default && <button type="button" onClick={() => void makeDefault(location)} disabled={busyId === location.id} aria-label={`Set ${location.label} as default`}>{busyId === location.id ? 'Saving…' : 'Set as default'}</button>}
              <button type="button" onClick={() => beginEdit(location)} aria-label={`Edit ${location.label}`}><Pencil size={16} aria-hidden="true" /><span className="sr-only">Edit</span></button>
              <button type="button" className="location-delete-action" onClick={() => void removeLocation(location)} disabled={busyId === location.id} aria-label={`Remove ${location.label}`}><Trash2 size={16} aria-hidden="true" /><span className="sr-only">Remove</span></button>
            </div>
          </li>
        })}</ul>}
      </>}
        {formOpen && <form className="location-editor" onSubmit={saveLocation} aria-labelledby="location-form-title">
          <div className="location-editor-heading"><div><span className="home-eyebrow">LOCATION DETAILS</span><h3 id="location-form-title">{editingId ? 'Edit location' : 'Add a location'}</h3></div>{editingId !== null && <button type="button" onClick={cancelEdit}>Cancel</button>}</div>
          {regionError && <p className="app-form-alert" role="alert">{regionError}<button type="button" onClick={() => { setRegionsLoading(true); void loadPage() }}>Try again</button></p>}
          {fieldError && <p className="app-form-alert" role="alert">{fieldError}</p>}
          <label className="app-form-field" htmlFor="location-label"><span>Location name</span><input id="location-label" required maxLength={80} autoFocus={editingId === null} value={form.label} onChange={(event) => setField('label', event.target.value)} placeholder="Home, Office, Family home" /></label>
          <label className="app-form-field" htmlFor="location-address"><span>House number, street and unit</span><textarea id="location-address" required maxLength={1000} rows={2} autoComplete="street-address" value={form.address_line} onChange={(event) => setField('address_line', event.target.value)} placeholder="e.g. 26 Jesus Street, Unit 2" /></label>
          <div className="location-editor-grid">
            <label className="app-form-field" htmlFor="location-region"><span>Region</span><select id="location-region" required disabled={regionsLoading || !regions.length} value={form.region_code} onChange={(event) => { const value = event.target.value; setProvincesLoading(Boolean(value)); setCitiesLoading(Boolean(value)); setBarangaysLoading(false); setProvinces([]); setCities([]); setBarangays([]); setFieldError(''); setForm((current) => ({ ...current, region_code: value, province_code: null, city_municipality_code: '', barangay_code: '' })) }}><option value="">{regionsLoading ? 'Loading regions…' : 'Choose a region'}</option>{regions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
            <label className="app-form-field" htmlFor="location-province"><span>Province <small>Optional</small></span><select id="location-province" value={form.province_code ?? ''} disabled={!form.region_code || provincesLoading || !provinces.length} onChange={(event) => { const value = event.target.value || null; setCitiesLoading(true); setBarangaysLoading(false); setCities([]); setBarangays([]); setFieldError(''); setForm((current) => ({ ...current, province_code: value, city_municipality_code: '', barangay_code: '' })) }}><option value="">{!form.region_code ? 'Choose a region first' : provincesLoading ? 'Loading provinces…' : provinces.length ? 'Choose a province (optional)' : 'No provinces for this region'}</option>{provinces.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
            <label className="app-form-field" htmlFor="location-city"><span>City or municipality</span><select id="location-city" required value={form.city_municipality_code} disabled={!form.region_code || citiesLoading} onChange={(event) => { const value = event.target.value; setBarangaysLoading(Boolean(value)); setBarangays([]); setFieldError(''); setForm((current) => ({ ...current, city_municipality_code: value, barangay_code: '' })) }}><option value="">{!form.region_code ? 'Choose a region first' : citiesLoading ? 'Loading cities…' : 'Choose a city or municipality'}</option>{cities.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
            <label className="app-form-field" htmlFor="location-barangay"><span>Barangay</span><select id="location-barangay" required value={form.barangay_code} disabled={!form.city_municipality_code || barangaysLoading} onChange={(event) => setField('barangay_code', event.target.value)}><option value="">{!form.city_municipality_code ? 'Choose a city first' : barangaysLoading ? 'Loading barangays…' : 'Choose a barangay'}</option>{barangays.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
            <label className="app-form-field" htmlFor="location-landmark"><span>Landmark <small>Optional</small></span><input id="location-landmark" maxLength={500} value={form.landmark ?? ''} onChange={(event) => setField('landmark', event.target.value || null)} placeholder="Nearby landmark" /></label>
            <label className="app-form-field" htmlFor="location-postal"><span>Postal code <small>Optional</small></span><input id="location-postal" maxLength={16} autoComplete="postal-code" value={form.postal_code ?? ''} onChange={(event) => setField('postal_code', event.target.value || null)} placeholder="Postal code" /></label>
          </div>
          <div className="location-priority-summary" aria-live="polite">
            <span className={`location-status ${editingId !== null ? (form.is_default ? 'location-status-default' : 'location-status-secondary') : locations.length === 0 ? 'location-status-default' : 'location-status-secondary'}`}>
              {(editingId !== null ? form.is_default : locations.length === 0) ? <><Star size={12} fill="currentColor" aria-hidden="true" /> Default</> : 'Secondary'}
            </span>
            <p>{editingId !== null ? 'To change the default address, use “Set as default” in your saved locations.' : locations.length === 0 ? 'Your first saved location will be your default service address.' : 'Additional locations are saved as secondary. You can make one the default from your saved locations.'}</p>
          </div>
          <div className="location-editor-actions"><Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button><Button type="submit" disabled={saving || optionsLoading} aria-busy={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save location'} {!saving && <ArrowRight size={16} aria-hidden="true" />}</Button></div>
        </form>}
    </section>
  </div>
}
