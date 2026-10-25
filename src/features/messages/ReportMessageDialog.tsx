import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { messagesService } from '../../services/messages.service'
import type { ChatMessage, MessageReportReason } from '../../types/messages'

const reasons: { value: MessageReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'fraud', label: 'Scam or asking to pay outside AYOS' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate photo or language' },
  { value: 'unsafe', label: 'Something unsafe' },
  { value: 'other', label: 'Something else' },
]

type Props = { message: ChatMessage; onClose: () => void }

export default function ReportMessageDialog({ message, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<MessageReportReason>('harassment')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await messagesService.report(message.id, reason, details)
      setSent(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t send this report. Try again.') }
    finally { setBusy(false) }
  }

  return <dialog ref={dialog} className="chat-dialog" aria-labelledby="report-title" onClose={onClose} onCancel={onClose}>
    <div className="chat-dialog-head"><h2 id="report-title">{sent ? 'Report sent' : 'Report this message'}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button></div>
    {sent ? <><p className="chat-dialog-copy">Thanks. The AYOS team will review it and may remove the message. The other person isn’t told who reported it.</p><div className="chat-dialog-actions"><button type="button" className="chat-button chat-button-primary" onClick={onClose} autoFocus>Done</button></div></>
      : <form onSubmit={(event) => void submit(event)}>
        {message.body && <blockquote className="chat-dialog-quote">{message.body}</blockquote>}
        <fieldset className="chat-dialog-reasons"><legend>What’s wrong with it?</legend>{reasons.map((item) => <label key={item.value}><input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />{item.label}</label>)}</fieldset>
        <label className="chat-dialog-field">Anything else we should know? <span>Optional</span><textarea rows={3} maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} /></label>
        {error && <p className="chat-composer-error" role="alert">{error}</p>}
        <div className="chat-dialog-actions"><button type="button" className="chat-button" onClick={onClose}>Cancel</button><button type="submit" className="chat-button chat-button-primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button></div>
      </form>}
  </dialog>
}
