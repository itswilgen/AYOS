import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Home, PencilLine, ShieldCheck, UserRound } from 'lucide-react'
import Button from '../components/ui/Button'
import AddressFields from '../components/address/AddressFields'
import { firstValidationError, useAddressFields } from '../components/address/useAddressFields'
import { apiRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'
import { locationsService } from '../services/locations.service'
import type { ServiceLocationSummary } from '../types/marketplace'
import './address-setup.css'

type Step = 'address' | 'review'

const steps: { key: Step | 'email'; label: string }[] = [
  { key: 'email', label: 'Email verified' },
  { key: 'address', label: 'Home address' },
  { key: 'review', label: 'Review & finish' },
]

export default function AddressSetupPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fields = useAddressFields()
  const { form, error, setError, optionsLoading, areaPreview } = fields
  const [step, setStep] = useState<Step>('address')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const { start } = fields

  useEffect(() => {
    let active = true
    void Promise.all([
      locationsService.getRegions(),
      apiRequest<{ data: ServiceLocationSummary | null }>('/account/address'),
    ])
      .then(([regionOptions, saved]) => {
        if (!active) return
        start(regionOptions, saved.data)
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : 'We couldn’t load the address form.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey, start])

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
        body: JSON.stringify({ ...fields.payload(), terms_accepted: accepted }),
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
              <AddressFields fields={fields} idPrefix="setup" />

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
