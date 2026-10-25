import { useState, type ChangeEvent, type DragEvent } from 'react'
import { Ban, ImagePlus, Trash2, Upload } from 'lucide-react'
import ServiceCoverCard, { type CoverCardService } from '../../components/common/ServiceCoverCard'
import { prepareImage } from '../../lib/images/prepareImage'
import type { CoverLayout } from '../../types/marketplace'
import type { ServiceCover } from '../../types/provider'
import { coverDraftFor, type CoverDraft } from './cover-draft'

const COVER_LIMITS = { minWidth: 1000, minHeight: 600, maxWidth: 1600, maxHeight: 2000 }

type Props = {
  existing: ServiceCover | null
  draft: CoverDraft
  onChange: (draft: CoverDraft) => void
  preview: Omit<CoverCardService, 'cover'>
  serviceActive: boolean
  /** Why an approved cover still can't reach customers, such as paused requests or no service area. */
  hiddenReason: string | null
  disabled: boolean
}

function CoverStatus({ existing, draft, serviceActive, hiddenReason }: Pick<Props, 'existing' | 'draft' | 'serviceActive' | 'hiddenReason'>) {
  if (draft.file) return <p className="provider-cover-status is-new"><strong>New image</strong> Saving sends it to AYOS for review.</p>
  if (draft.remove) return <p className="provider-cover-status"><strong>Cover will be removed</strong> when you save.</p>
  if (!existing) return null
  if (existing.status === 'approved') {
    const reason = serviceActive ? hiddenReason : 'Enable this service so customers can see it.'
    return reason
      ? <p className="provider-cover-status is-pending"><strong>Approved, but not showing yet</strong> {reason}</p>
      : <p className="provider-cover-status is-approved"><strong>On the Home page</strong> Shown to customers in your service areas.</p>
  }
  if (existing.status === 'rejected') {
    return <p className="provider-cover-status is-rejected"><strong>Not approved</strong> {existing.note} Upload a new image to send it for review again.</p>
  }
  return <p className="provider-cover-status is-pending"><strong>Waiting for review</strong> You’ll get a notification when AYOS has checked it.</p>
}

/** Lets a provider add a photo or poster for one service and see exactly how customers will see it on Home. */
export default function ServiceCoverEditor({ existing, draft, onChange, preview, serviceActive, hiddenReason, disabled }: Props) {
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const image = draft.previewUrl ?? (draft.remove ? null : existing?.image ?? null)
  const setLayout = (layout: Partial<CoverLayout>) => onChange({ ...draft, layout: { ...draft.layout, ...layout } })

  const choose = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setPreparing(true)
    try {
      const prepared = await prepareImage(file, COVER_LIMITS)
      if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl)
      // Tall or square images are usually posters; showing them whole keeps their text from being cropped.
      const fit = prepared.height / prepared.width > 0.9 ? 'contain' : 'cover'
      onChange({ file: prepared.file, previewUrl: prepared.previewUrl, remove: false, layout: { fit, focusX: 50, focusY: 50 } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This image could not be used. Try another file.')
    } finally {
      setPreparing(false)
    }
  }
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    void choose(event.target.files?.[0])
    event.target.value = ''
  }
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void choose(event.dataTransfer.files[0])
  }
  const remove = () => {
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl)
    onChange({ ...coverDraftFor(existing), remove: Boolean(existing) })
  }
  const fileInput = <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || preparing} onChange={pick} />

  return <fieldset className="provider-cover" disabled={disabled}>
    <legend>Home page cover <span>Optional</span></legend>
    <p className="provider-muted">A photo of your work or your business poster. After a quick review, it can appear on the Home page for customers in your service areas.</p>
    <CoverStatus existing={existing} draft={draft} serviceActive={serviceActive} hiddenReason={hiddenReason} />

    {image
      ? <figure className="provider-cover-preview"><figcaption>Preview: how customers see it on Home</figcaption><ServiceCoverCard service={{ ...preview, cover: { image, ...draft.layout } }} /></figure>
      : <label className={dragging ? 'provider-cover-drop is-dragging' : 'provider-cover-drop'} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
        <ImagePlus size={26} aria-hidden="true" />
        <strong>{preparing ? 'Preparing image…' : 'Upload a photo or poster'}</strong>
        <small>JPEG, PNG, or WebP · at least 1000 × 600 pixels</small>
        {fileInput}
      </label>}

    {image && <>
      <div className="provider-cover-fit" role="radiogroup" aria-label="How the image fits the card">
        <label><input className="sr-only" type="radio" name="cover-fit" checked={draft.layout.fit === 'cover'} onChange={() => setLayout({ fit: 'cover' })} /><span>Fill the card</span></label>
        <label><input className="sr-only" type="radio" name="cover-fit" checked={draft.layout.fit === 'contain'} onChange={() => setLayout({ fit: 'contain' })} /><span>Show the whole image</span></label>
      </div>
      {draft.layout.fit === 'cover' && <div className="provider-cover-position">
        <label>Move left or right<input type="range" min="0" max="100" value={draft.layout.focusX} onChange={(event) => setLayout({ focusX: Number(event.target.value) })} /></label>
        <label>Move up or down<input type="range" min="0" max="100" value={draft.layout.focusY} onChange={(event) => setLayout({ focusY: Number(event.target.value) })} /></label>
      </div>}
      <div className="provider-cover-actions">
        <label className="provider-button"><Upload size={16} aria-hidden="true" /> {preparing ? 'Preparing…' : 'Choose another image'}{fileInput}</label>
        <button type="button" className="provider-button provider-cover-remove" onClick={remove}><Trash2 size={16} aria-hidden="true" /> Remove cover</button>
      </div>
    </>}

    {error && <p className="provider-inline-warning" role="alert">{error}</p>}
    <ul className="provider-cover-rules" aria-label="Cover rules">
      <li><Ban size={15} aria-hidden="true" /> No phone numbers, Messenger links, QR codes, or websites. Customers contact you through AYOS.</li>
      <li><Ban size={15} aria-hidden="true" /> No prices, discounts, or license claims AYOS hasn’t verified.</li>
      <li><Ban size={15} aria-hidden="true" /> No one else’s photos. Show your own business and your own work.</li>
    </ul>
  </fieldset>
}
