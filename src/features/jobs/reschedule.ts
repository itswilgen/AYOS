import { apiTime } from '../../lib/time/api-time'

export type RescheduleSide = 'customer' | 'provider'
export type RescheduleAnswer = 'accept' | 'decline' | 'withdraw'

/** An open request to move a scheduled visit, as both sides receive it. */
export type OpenReschedule = { requestedBy: RescheduleSide; proposedAt: string; reason: string | null }

const visitFormat = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "Thu, Nov 19, 2:00 PM" for an API time. */
export const visitTime = (value: string) => visitFormat.format(apiTime(value))

/** The value a datetime-local input needs for a moment, in the viewer's own time. */
export function localInput(date: Date) {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
