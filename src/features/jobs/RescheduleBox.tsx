import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { localInput, visitTime, type OpenReschedule, type RescheduleAnswer, type RescheduleSide } from './reschedule'

type Props = {
  side: RescheduleSide
  /** The other person, e.g. "Jun Reyes Plumbing" or the customer's first name. */
  otherName: string
  currentAt: string | null
  open: OpenReschedule | null
  /** True while the "ask for a new time" form is showing; the parent places the button that opens it. */
  editing: boolean
  busy: boolean
  onCloseForm: () => void
  onPropose: (proposedAt: string, reason: string) => void
  onAnswer: (answer: RescheduleAnswer) => void
}

/**
 * Moving a scheduled visit, for either side. Shows the open request (old time crossed out, new time beside it)
 * with the right buttons for who is looking, or the form to ask for a new time. The old time stands until accepted.
 */
export default function RescheduleBox({ side, otherName, currentAt, open, editing, busy, onCloseForm, onPropose, onAnswer }: Props) {
  if (open) {
    const mine = open.requestedBy === side
    return <div className={`reschedule-box ${mine ? 'is-waiting' : 'is-asked'}`} role="group" aria-label="New visit time">
      <p className="reschedule-kicker"><CalendarClock size={16} aria-hidden="true" /> {mine ? `You asked for a new time · waiting for ${otherName}` : `${otherName} asked for a new time`}</p>
      <p className="reschedule-times">
        {currentAt && <><s aria-label={`Now ${visitTime(currentAt)}`}>{visitTime(currentAt)}</s><ArrowRight size={16} aria-hidden="true" /></>}
        <strong>{visitTime(open.proposedAt)}</strong>
      </p>
      {open.reason && <p className="reschedule-reason">“{open.reason}”</p>}
      <div className="reschedule-actions">
        {mine
          ? <button type="button" className="provider-button" disabled={busy} onClick={() => onAnswer('withdraw')}>Withdraw</button>
          : <>
            <button type="button" className="provider-button provider-button-primary" disabled={busy} onClick={() => onAnswer('accept')}>Accept new time</button>
            <button type="button" className="provider-button" disabled={busy} onClick={() => onAnswer('decline')}>Keep the old time</button>
          </>}
      </div>
      {!mine && <p className="reschedule-note">Until you answer, the visit stays at the old time.</p>}
    </div>
  }
  if (!editing) return null
  return <ProposeForm otherName={otherName} busy={busy} onClose={onCloseForm} onPropose={onPropose} />
}

function ProposeForm({ otherName, busy, onClose, onPropose }: { otherName: string; busy: boolean; onClose: () => void; onPropose: (proposedAt: string, reason: string) => void }) {
  const [when, setWhen] = useState('')
  const [reason, setReason] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onPropose(new Date(when).toISOString(), reason)
  }
  return <form className="provider-form reschedule-form" onSubmit={submit}>
    <label>New date and time<input required type="datetime-local" min={localInput(new Date())} value={when} onChange={(event) => setWhen(event.target.value)} /></label>
    <label>Reason <span>Optional · {otherName} will see it</span><textarea maxLength={240} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: I'll be out of town that day." /></label>
    <div className="reschedule-actions">
      <button type="submit" className="provider-button provider-button-primary" disabled={busy || !when}>Send new time</button>
      <button type="button" className="provider-button" disabled={busy} onClick={onClose}>Cancel</button>
    </div>
  </form>
}
