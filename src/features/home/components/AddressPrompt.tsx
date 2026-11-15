import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MapPin, RotateCw, ShieldCheck, X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import AddressFields from '../../../components/address/AddressFields'
import { firstValidationError, useAddressFields } from '../../../components/address/useAddressFields'
import { apiRequest } from '../../../lib/api/client'
import { useAuth } from '../../../lib/auth/useAuth'
import { locationsService } from '../../../services/locations.service'
import type { ServiceLocationSummary } from '../../../types/marketplace'
import './address-prompt.css'

/** "Later" hides the prompt for this browser session only, so a customer without an address is asked again next visit. */
const LATER_KEY = 'ayos.addressPrompt.later'

function laterChosen(): boolean {
  try { return sessionStorage.getItem(LATER_KEY) === '1' } catch { return false }
}

function rememberLater() {
  try { sessionStorage.setItem(LATER_KEY, '1') } catch { /* storage blocked: the prompt simply returns on the next Home visit */ }
}

type Props = {
  /** Called with the saved address, which is now the customer's default location. */
  onSaved: (location: ServiceLocationSummary) => void
}

/**
 * Opens over Home for a signed-in customer who has no saved address yet (a fresh account),
 * so the first thing they do is tell AYOS where providers should come.
 */
export default function AddressPrompt({ onSaved }: Props) {
  const { refreshUser } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(() => !laterChosen())
  const [regionsState, setRegionsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const fields = useAddressFields()
  const { start, error, setError, optionsLoading } = fields

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [open])

  useEffect(() => {
    if (!open) return
    let active = true
    locationsService.getRegions().then(
      (regions) => { if (!active) return; start(regions); setRegionsState('ready') },
      () => { if (active) setRegionsState('error') },
    )
    return () => { active = false }
  }, [open, reloadKey, start])

  const later = () => {
    rememberLater()
    dialogRef.current?.close()
    setOpen(false)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ data: ServiceLocationSummary }>('/account/address', {
        method: 'PUT',
        body: JSON.stringify(fields.payload()),
      })
      await refreshUser()
      dialogRef.current?.close()
      setOpen(false)
      onSaved(result.data)
    } catch (reason) {
      setError(firstValidationError(reason) || (reason instanceof Error ? reason.message : 'We couldn’t save your address. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return <dialog
    ref={dialogRef}
    className="address-prompt"
    aria-labelledby="address-prompt-title"
    aria-describedby="address-prompt-lede"
    // Esc closes the dialog; treat it as "Later" so the choice is remembered for this session.
    onCancel={(event) => { event.preventDefault(); later() }}
  >
    <form className="address-prompt-form" onSubmit={save}>
      <header className="address-prompt-head">
        <span className="address-prompt-mark" aria-hidden="true"><MapPin size={20} /></span>
        <div>
          <p className="address-prompt-kicker">One last step</p>
          <h2 id="address-prompt-title">Where should providers come?</h2>
          <p id="address-prompt-lede">Add your home address once. Providers who serve your barangay show up first, and you can change it anytime.</p>
        </div>
        <button type="button" className="address-prompt-close" aria-label="Close and add my address later" onClick={later}><X size={18} aria-hidden="true" /></button>
      </header>

      <div className="address-prompt-body">
        {regionsState === 'loading' && <p className="address-prompt-status" role="status">Loading the address form…</p>}
        {regionsState === 'error' && <div className="address-prompt-status" role="alert">
          <p>We couldn’t load the address form. Check your connection, then try again.</p>
          <button type="button" className="address-prompt-retry" onClick={() => { setRegionsState('loading'); setReloadKey((key) => key + 1) }}><RotateCw size={15} aria-hidden="true" /> Try again</button>
        </div>}
        {regionsState === 'ready' && <AddressFields fields={fields} idPrefix="prompt" />}
        {error && <p className="setup-error" role="alert">{error}</p>}
      </div>

      <footer className="address-prompt-foot">
        <p className="address-prompt-note"><ShieldCheck size={15} aria-hidden="true" /> Your street is only shown to providers you send a request to.</p>
        <div className="address-prompt-actions">
          <button type="button" className="address-prompt-later" onClick={later}>Later</button>
          <Button type="submit" className="address-prompt-save" disabled={regionsState !== 'ready' || optionsLoading || busy} loading={busy}>{busy ? 'Saving…' : 'Save address'}</Button>
        </div>
      </footer>
    </form>
  </dialog>
}
