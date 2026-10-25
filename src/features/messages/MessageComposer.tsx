import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ImagePlus, LoaderCircle, SendHorizontal, X } from 'lucide-react'
import { prepareImage, type PreparedImage } from '../../lib/images/prepareImage'

const MAX_LENGTH = 2000
const IMAGE_LIMITS = { minWidth: 1, minHeight: 1, maxWidth: 1600, maxHeight: 1600 }

type Props = {
  disabled: boolean
  /** Resolves when the message is saved. Throws with a readable message when it isn't. */
  onSend: (message: { body: string; image: File | null }) => Promise<void>
}

/** Enter sends, Shift+Enter adds a line. One photo per message, shrunk on the device before upload. */
export default function MessageComposer({ disabled, onSend }: Props) {
  const [body, setBody] = useState('')
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (image) URL.revokeObjectURL(image.previewUrl) }, [image])
  useEffect(() => {
    const element = field.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [body])

  const canSend = !disabled && !sending && !preparing && (body.trim().length > 0 || image !== null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setPreparing(true)
    try { setImage(await prepareImage(file, IMAGE_LIMITS)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This photo couldn’t be added.') }
    finally {
      setPreparing(false)
      if (picker.current) picker.current.value = ''
    }
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      await onSend({ body, image: image?.file ?? null })
      setBody('')
      setImage(null)
      field.current?.focus()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your message wasn’t sent. Try again.') }
    finally { setSending(false) }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return <form className="chat-composer" onSubmit={(event) => void submit(event)}>
    {error && <p className="chat-composer-error" role="alert">{error}</p>}
    {image && <div className="chat-composer-attachment"><img src={image.previewUrl} alt="Photo to send" /><button type="button" aria-label="Remove photo" onClick={() => setImage(null)} disabled={sending}><X size={14} aria-hidden="true" /></button></div>}
    <div className="chat-composer-row">
      <input ref={picker} className="sr-only" id="chat-photo" type="file" accept="image/jpeg,image/png,image/webp" tabIndex={-1} onChange={(event) => void pick(event.target.files?.[0])} disabled={disabled || sending} />
      <button type="button" className="chat-composer-tool" aria-label={image ? 'Replace photo' : 'Add a photo'} disabled={disabled || sending || preparing} onClick={() => picker.current?.click()}>
        {preparing ? <LoaderCircle className="chat-spin" size={19} aria-hidden="true" /> : <ImagePlus size={19} aria-hidden="true" />}
      </button>
      <label className="sr-only" htmlFor="chat-body">Message</label>
      <textarea ref={field} id="chat-body" rows={1} maxLength={MAX_LENGTH} value={body} disabled={disabled} placeholder={disabled ? 'Messaging is unavailable' : 'Write a message'} onChange={(event) => setBody(event.target.value)} onKeyDown={onKeyDown} />
      <button type="submit" className="chat-composer-send" aria-label="Send message" disabled={!canSend}>
        {sending ? <LoaderCircle className="chat-spin" size={18} aria-hidden="true" /> : <SendHorizontal size={18} aria-hidden="true" />}
      </button>
    </div>
    {body.length > MAX_LENGTH - 200 && <p className="chat-composer-count" aria-live="polite">{MAX_LENGTH - body.length} characters left</p>}
  </form>
}
