import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import FormField from '../components/auth/FormField'
import Button from '../components/ui/Button'
import { ApiError, apiRequest } from '../lib/api/client'
import { useAuth } from '../lib/auth/useAuth'

type AddressFields = {
  address_line: string
  barangay: string
  city: string
  province: string
  postal_code: string
}

type AddressKey = keyof AddressFields

const emptyAddress: AddressFields = {
  address_line: '', barangay: '', city: '', province: '', postal_code: '',
}

function normalizeAddress(address: Partial<AddressFields>): AddressFields {
  return {
    address_line: address.address_line ?? '',
    barangay: address.barangay ?? '',
    city: address.city ?? '',
    province: address.province ?? '',
    postal_code: address.postal_code ?? '',
  }
}

export default function AddressSetupPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState<AddressFields>(emptyAddress)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'address' | 'review'>('address')
  const [accepted, setAccepted] = useState(false)

  const loadAddress = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const saved = await apiRequest<AddressFields>('/account/address')
      setAddress(normalizeAddress(saved))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We couldn’t load your address details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void apiRequest<AddressFields>('/account/address')
      .then((saved) => {
        if (!active) return
        setAddress(normalizeAddress(saved))
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'We couldn’t load your address details.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const setField = (key: AddressKey, value: string) => {
    setAddress((current) => ({ ...current, [key]: value }))
  }

  const continueToReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStep('review')
  }

  const finishSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest<AddressFields>('/account/address', {
        method: 'PUT',
        body: JSON.stringify({ ...address, terms_accepted: accepted }),
      })
      await refreshUser()
      navigate('/account', { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'We couldn’t save your address. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="auth-form-shell address-setup" role="status">Loading your address details…</div>
  }

  return <div className="auth-form-shell address-setup">
    <Link className="address-back" to="/account"><ArrowLeft size={17} aria-hidden="true" /> Account</Link>
    <div className="address-progress" aria-label="Account setup progress">
      <span className="address-progress-done"><Check size={14} aria-hidden="true" /> Email verified</span>
      <span className="address-progress-line" aria-hidden="true" />
      {step === 'address'
        ? <span className="address-progress-current"><span>2</span> Home address</span>
        : <span className="address-progress-done"><Check size={14} aria-hidden="true" /> Home address</span>}
      <span className="address-progress-line" aria-hidden="true" />
      {step === 'review'
        ? <span className="address-progress-current"><span>3</span> Review &amp; finish</span>
        : <span className="address-progress-upcoming"><span>3</span> Review &amp; finish</span>}
    </div>
    {error && <p className="form-notice address-error" role="alert">{error}{error.includes('load your address') && <button type="button" className="quiet-link" onClick={() => void loadAddress()}>Try again</button>}</p>}

    {step === 'address' ? <>
      <span className="auth-kicker">A better local match starts here</span>
      <h1>Where are you?</h1>
      <p className="auth-intro">Add the address where you’d like service. It helps AYOS connect you with providers who serve your area.</p>
      <form className="address-form" onSubmit={continueToReview}>
        <div className="address-form-heading"><h2>Full address</h2><span>Required</span></div>
        <label className="address-textarea-label" htmlFor="address_line">House number, street, and unit</label>
        <textarea id="address_line" name="address_line" autoComplete="street-address" required maxLength={1000} value={address.address_line} onChange={(event) => setField('address_line', event.target.value)} placeholder="e.g. 26 Jesus Street, Unit 2" rows={2} />
        <div className="address-fields-grid">
          <FormField label="Barangay" name="barangay" autoComplete="address-level3" required maxLength={120} value={address.barangay} onChange={(event) => setField('barangay', event.target.value)} placeholder="Your barangay" />
          <FormField label="City or municipality" name="city" autoComplete="address-level2" required maxLength={120} value={address.city} onChange={(event) => setField('city', event.target.value)} placeholder="e.g. Tanjay City" />
          <FormField label="Province" name="province" autoComplete="address-level1" required maxLength={120} value={address.province} onChange={(event) => setField('province', event.target.value)} placeholder="Your province" />
          <FormField label="Postal code" name="postal_code" autoComplete="postal-code" maxLength={16} value={address.postal_code} onChange={(event) => setField('postal_code', event.target.value)} placeholder="Optional" />
        </div>
        <p className="address-form-hint">Use an address where you’re comfortable receiving a service visit. You can update it later.</p>
        <div className="address-actions">
          <Link className="address-secondary-link" to="/account"><ArrowLeft size={16} aria-hidden="true" /> Back to account</Link>
          <Button type="submit" className="address-save-button">Review details <ArrowRight size={17} aria-hidden="true" /></Button>
        </div>
      </form>
      <p className="address-security-note"><ShieldCheck size={16} aria-hidden="true" /> Your address is used to improve local service matching.</p>
    </> : <>
      <span className="auth-kicker">One last check</span>
      <h1>Review &amp; finish</h1>
      <p className="auth-intro">Double-check your information and confirm your AYOS terms to finish setting up your account.</p>
      <form className="address-review-form" onSubmit={finishSetup}>
        <dl className="address-review-summary">
          <div><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
          <div><dt>Name</dt><dd>{user?.name || '—'}</dd></div>
          <div><dt>Mobile</dt><dd>{user?.mobile_number || '—'}</dd></div>
          <div className="address-review-full"><dt>Address</dt><dd>{[address.address_line, address.barangay, address.city, address.province, address.postal_code, 'Philippines'].filter(Boolean).join(', ')}</dd></div>
        </dl>
        <label className="address-review-terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>I confirm my information and agree to AYOS’s <Link to="/terms" target="_blank" rel="noreferrer">Terms</Link> and <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.</span></label>
        <div className="address-actions">
          <Button type="button" variant="secondary" className="address-review-back" onClick={() => { setError(''); setStep('address') }}><ArrowLeft size={16} aria-hidden="true" /> Back</Button>
          <Button type="submit" className="address-save-button" disabled={busy || !accepted} aria-busy={busy}>{busy ? 'Finishing setup…' : 'Finish setup'} {!busy && <ArrowRight size={17} aria-hidden="true" />}</Button>
        </div>
      </form>
      <p className="address-security-note"><ShieldCheck size={16} aria-hidden="true" /> Your account is already created. Finishing saves this address to your profile.</p>
    </>}
  </div>
}
