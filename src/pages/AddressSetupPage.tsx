import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Home, MapPin, PencilLine, ShieldCheck, UserRound } from 'lucide-react'
import Button from '../components/ui/Button'
import { ApiError, apiRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'
import { locationsService } from '../services/locations.service'
import type { LocationOption, ServiceLocationSummary } from '../types/marketplace'
import './address-setup.css'

type AddressForm = {
  region_code: string
  province_code: string
  city_municipality_code: string
  barangay_code: string
  address_line: string
  landmark: string
  postal_code: string
}

type Step = 'address' | 'review'

const emptyForm: AddressForm = {
  region_code: '', province_code: '', city_municipality_code: '', barangay_code: '', address_line: '', landmark: '', postal_code: '',
}

function formFromLocation(location: ServiceLocationSummary): AddressForm {
  return {
    region_code: location.region.code,
    province_code: location.province?.code ?? '',
    city_municipality_code: location.city_municipality.code,
    barangay_code: location.barangay.code,
    address_line: location.address_line,
    landmark: location.landmark ?? '',
    postal_code: location.postal_code ?? '',
  }
}

function firstValidationError(error: unknown): string {
  if (error instanceof ApiError && typeof error.details === 'object' && error.details !== null && 'errors' in error.details) {
    const errors = error.details.errors
    if (typeof errors === 'object' && errors !== null) {
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    }
  }
  return ''
}

const nameOf = (options: LocationOption[], code: string) => options.find((option) => option.code === code)?.name ?? ''

const steps: { key: Step | 'email'; label: string }[] = [
  { key: 'email', label: 'Email verified' },
  { key: 'address', label: 'Home address' },
  { key: 'review', label: 'Review & finish' },
]

export default function AddressSetupPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [step, setStep] = useState<Step>('address')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [barangaysLoading, setBarangaysLoading] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      locationsService.getRegions(),
      apiRequest<{ data: ServiceLocationSummary | null }>('/account/address'),
    ])
      .then(([regionOptions, saved]) => {
        if (!active) return
        setRegions(regionOptions)
        if (saved.data) {
          const prefill = formFromLocation(saved.data)
          setForm(prefill)
          setProvincesLoading(true)
          setCitiesLoading(true)
          setBarangaysLoading(true)
        }
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : 'We couldn’t load the address form.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    if (!form.region_code) return
    let active = true
    void locationsService.getProvinces(form.region_code)
      .then((items) => {
        if (!active) return
        setProvinces(items)
        if (items.length === 1) {
          setCitiesLoading(true)
          setForm((current) => current.province_code ? current : { ...current, province_code: items[0].code })
        }
      })
      .catch(() => { if (active) setError('Couldn’t load provinces for that region.') })
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
      .then((items) => {
        if (!active) return
        setCities(items)
        if (items.length === 1) {
          setBarangaysLoading(true)
          setForm((current) => current.city_municipality_code ? current : { ...current, city_municipality_code: items[0].code })
        }
      })
      .catch(() => { if (active) setError('Couldn’t load cities for that area.') })
      .finally(() => { if (active) setCitiesLoading(false) })
    return () => { active = false }
  }, [form.region_code, form.province_code])

  useEffect(() => {
    if (!form.city_municipality_code) return
    let active = true
    void locationsService.getBarangays(form.city_municipality_code)
      .then((items) => {
        if (!active) return
        setBarangays(items)
        if (items.length === 1) setForm((current) => current.barangay_code ? current : { ...current, barangay_code: items[0].code })
      })
      .catch(() => { if (active) setError('Couldn’t load barangays for that city.') })
      .finally(() => { if (active) setBarangaysLoading(false) })
    return () => { active = false }
  }, [form.city_municipality_code])

  const chooseRegion = (code: string) => {
    setProvinces([]); setCities([]); setBarangays([])
    setProvincesLoading(Boolean(code)); setCitiesLoading(Boolean(code)); setBarangaysLoading(false)
    setError('')
    setForm((current) => ({ ...current, region_code: code, province_code: '', city_municipality_code: '', barangay_code: '' }))
  }

  const chooseProvince = (code: string) => {
    setCities([]); setBarangays([])
    setCitiesLoading(true); setBarangaysLoading(false)
    setError('')
    setForm((current) => ({ ...current, province_code: code, city_municipality_code: '', barangay_code: '' }))
  }

  const chooseCity = (code: string) => {
    setBarangays([])
    setBarangaysLoading(Boolean(code))
    setError('')
    setForm((current) => ({ ...current, city_municipality_code: code, barangay_code: '' }))
  }

  const setField = (key: keyof AddressForm, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const optionsLoading = provincesLoading || citiesLoading || barangaysLoading
  const areaParts = [
    nameOf(barangays, form.barangay_code),
    nameOf(cities, form.city_municipality_code),
    nameOf(provinces, form.province_code),
    nameOf(regions, form.region_code),
  ]
  const areaComplete = Boolean(form.region_code && form.city_municipality_code && form.barangay_code)
  const areaPreview = areaParts.filter(Boolean).join(', ')

  const continueToReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStep('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const finishSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/account/address', {
        method: 'PUT',
        body: JSON.stringify({
          label: 'Home',
          region_code: form.region_code,
          province_code: form.province_code || null,
          city_municipality_code: form.city_municipality_code,
          barangay_code: form.barangay_code,
          address_line: form.address_line.trim(),
          landmark: form.landmark.trim() || null,
          postal_code: form.postal_code.trim() || null,
          terms_accepted: accepted,
        }),
      })
      await refreshUser()
      navigate('/account', { replace: true })
    } catch (reason) {
      setError(firstValidationError(reason) || (reason instanceof Error ? reason.message : 'We couldn’t save your address. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const currentIndex = step === 'address' ? 1 : 2

  return <div className="setup">
    <ol className="setup-steps" aria-label="Account setup progress">
      {steps.map((item, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        return <li key={item.key} className={`setup-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
          <span className="setup-step-mark" aria-hidden="true">{state === 'done' ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
          <span className="setup-step-label">{item.label}</span>
          <span className="setup-sr">{state === 'done' ? ' (completed)' : state === 'upcoming' ? ' (next)' : ''}</span>
        </li>
      })}
    </ol>

    <section className="setup-card">
      {loading ? <p className="setup-loading" role="status">Loading the address form…</p>
        : loadError ? <div className="setup-load-error" role="alert">
          <p>{loadError}</p>
          <Button type="button" variant="secondary" onClick={() => { setLoadError(''); setLoading(true); setReloadKey((key) => key + 1) }}>Try again</Button>
        </div>
          : step === 'address' ? <div className="setup-panel" key="address">
            <header className="setup-head">
              <span className="setup-kicker">Step 2 of 3</span>
              <h1>Where should providers come?</h1>
              <p>Pick your area from the lists, then add your street. Providers who serve your barangay will show up first.</p>
            </header>

            <form className="setup-form" onSubmit={continueToReview}>
              <fieldset className="setup-group">
                <legend><span className="setup-group-index">1</span> Your area</legend>
                <div className="setup-grid">
                  <label className="setup-field" htmlFor="setup-region">
                    <span>Region</span>
                    <select id="setup-region" required autoComplete="off" value={form.region_code} disabled={!regions.length} onChange={(event) => chooseRegion(event.target.value)}>
                      <option value="">Choose a region</option>
                      {regions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                    </select>
                  </label>
                  <label className="setup-field" htmlFor="setup-province">
                    <span>Province {!provincesLoading && form.region_code && !provinces.length && <small>Not needed here</small>}</span>
                    <select id="setup-province" value={form.province_code} disabled={!form.region_code || provincesLoading || !provinces.length} onChange={(event) => chooseProvince(event.target.value)}>
                      <option value="">{!form.region_code ? 'Choose a region first' : provincesLoading ? 'Loading provinces…' : provinces.length ? 'Choose a province' : 'No provinces in this region'}</option>
                      {provinces.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                    </select>
                  </label>
                  <label className="setup-field" htmlFor="setup-city">
                    <span>City or municipality</span>
                    <select id="setup-city" required value={form.city_municipality_code} disabled={!form.region_code || citiesLoading} onChange={(event) => chooseCity(event.target.value)}>
                      <option value="">{!form.region_code ? 'Choose a region first' : citiesLoading ? 'Loading cities…' : 'Choose a city or municipality'}</option>
                      {cities.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                    </select>
                  </label>
                  <label className="setup-field" htmlFor="setup-barangay">
                    <span>Barangay</span>
                    <select id="setup-barangay" required value={form.barangay_code} disabled={!form.city_municipality_code || barangaysLoading} onChange={(event) => { setError(''); setField('barangay_code', event.target.value) }}>
                      <option value="">{!form.city_municipality_code ? 'Choose a city first' : barangaysLoading ? 'Loading barangays…' : 'Choose a barangay'}</option>
                      {barangays.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                    </select>
                  </label>
                </div>
                <p className={`setup-area-preview${areaComplete ? ' is-complete' : ''}`} aria-live="polite">
                  <MapPin size={16} aria-hidden="true" />
                  <span>{areaPreview || 'Your area will appear here as you choose.'}</span>
                </p>
              </fieldset>

              <fieldset className="setup-group">
                <legend><span className="setup-group-index">2</span> Street details</legend>
                <label className="setup-field" htmlFor="setup-street">
                  <span>House no., street, and unit</span>
                  <input id="setup-street" name="address_line" autoComplete="street-address" required maxLength={1000} value={form.address_line} onChange={(event) => setField('address_line', event.target.value)} placeholder="e.g. 26 Jesus Street, Unit 2" />
                </label>
                <div className="setup-grid setup-grid-details">
                  <label className="setup-field" htmlFor="setup-landmark">
                    <span>Landmark <small>Optional</small></span>
                    <input id="setup-landmark" name="landmark" maxLength={500} value={form.landmark} onChange={(event) => setField('landmark', event.target.value)} placeholder="e.g. Beside the chapel, blue gate" />
                  </label>
                  <label className="setup-field" htmlFor="setup-postal">
                    <span>Postal code <small>Optional</small></span>
                    <input id="setup-postal" name="postal_code" autoComplete="postal-code" inputMode="numeric" maxLength={16} value={form.postal_code} onChange={(event) => setField('postal_code', event.target.value)} placeholder="e.g. 6204" />
                  </label>
                </div>
              </fieldset>

              {error && <p className="setup-error" role="alert">{error}</p>}

              <div className="setup-actions">
                <Link className="setup-back" to="/account"><ArrowLeft size={16} aria-hidden="true" /> Back to account</Link>
                <Button type="submit" disabled={optionsLoading}>Review details <ArrowRight size={17} aria-hidden="true" /></Button>
              </div>
            </form>
          </div>
            : <div className="setup-panel" key="review">
              <header className="setup-head">
                <span className="setup-kicker">Step 3 of 3</span>
                <h1>Review &amp; finish</h1>
                <p>Check that everything looks right. You can change your address later in Saved locations.</p>
              </header>

              <form className="setup-form" onSubmit={finishSetup}>
                <div className="setup-summary">
                  <section className="setup-summary-card" aria-labelledby="summary-account">
                    <h2 id="summary-account"><UserRound size={16} aria-hidden="true" /> Account</h2>
                    <dl>
                      <div><dt>Name</dt><dd>{user?.name || '—'}</dd></div>
                      <div><dt>Email</dt><dd>{user?.email || '—'} <span className="setup-verified"><Check size={12} strokeWidth={3} aria-hidden="true" /> Verified</span></dd></div>
                      <div><dt>Mobile</dt><dd>{user?.mobile_number || '—'}</dd></div>
                    </dl>
                  </section>
                  <section className="setup-summary-card" aria-labelledby="summary-address">
                    <h2 id="summary-address"><Home size={16} aria-hidden="true" /> Home address</h2>
                    <button type="button" className="setup-edit" onClick={() => { setError(''); setStep('address') }}><PencilLine size={14} aria-hidden="true" /> Edit</button>
                    <address>
                      <strong>{form.address_line}</strong>
                      <span>{areaPreview}</span>
                      {(form.landmark || form.postal_code) && <span className="setup-address-extra">{[form.landmark && `Landmark: ${form.landmark}`, form.postal_code && `Postal code ${form.postal_code}`].filter(Boolean).join(' · ')}</span>}
                    </address>
                  </section>
                </div>

                <label className="setup-terms">
                  <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
                  <span>I confirm these details and agree to AYOS’s <Link to="/terms" target="_blank" rel="noreferrer">Terms</Link> and <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.</span>
                </label>

                {error && <p className="setup-error" role="alert">{error}</p>}

                <div className="setup-actions">
                  <button type="button" className="setup-back" onClick={() => { setError(''); setStep('address') }}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                  <Button type="submit" disabled={busy || !accepted} loading={busy}>{busy ? 'Finishing setup…' : 'Finish setup'} {!busy && <ArrowRight size={17} aria-hidden="true" />}</Button>
                </div>
              </form>
            </div>}
    </section>

    <p className="setup-note"><ShieldCheck size={15} aria-hidden="true" /> Your street address is only shown to providers you send a request to.</p>
  </div>
}
