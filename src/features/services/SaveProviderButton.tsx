import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { savedProvidersService } from '../../services/home.service'
import './save-provider.css'

type Props = {
  providerId: string
  providerName: string
  saved: boolean
  /** "icon" sits in a search card's corner; "full" is a labelled button on the profile. */
  variant?: 'icon' | 'full'
  onChange?: (saved: boolean) => void
}

/**
 * Save or unsave a provider. Updates at once (the request is safe to repeat), and puts things back
 * with a short reason if the server says no.
 */
export default function SaveProviderButton({ providerId, providerName, saved: initial, variant = 'full', onChange }: Props) {
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = async () => {
    const next = !saved
    setSaved(next)
    setBusy(true)
    setError('')
    try {
      await (next ? savedProvidersService.save(providerId) : savedProvidersService.remove(providerId))
      onChange?.(next)
    } catch (cause) {
      setSaved(!next)
      setError(cause instanceof Error ? cause.message : 'That didn’t save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const Icon = saved ? BookmarkCheck : Bookmark
  const label = saved ? `Remove ${providerName} from saved providers` : `Save ${providerName}`
  return <span className={`save-provider is-${variant}`}>
    <button type="button" className={`save-provider-button${saved ? ' is-saved' : ''}`} aria-pressed={saved} aria-label={variant === 'icon' ? label : undefined}
      title={variant === 'icon' ? label : undefined} disabled={busy} onClick={() => void toggle()}>
      <Icon size={variant === 'icon' ? 18 : 17} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      {variant === 'full' && <span>{saved ? 'Saved to your providers' : 'Save for later'}</span>}
    </button>
    {error && <span className="save-provider-error" role="alert">{error}</span>}
  </span>
}
