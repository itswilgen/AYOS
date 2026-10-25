import type { ChatMessage } from '../../types/messages'

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export function dayLabel(value: string): string {
  const day = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(day, today)) return 'Today'
  if (sameDay(day, yesterday)) return 'Yesterday'
  return day.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', ...(day.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}

export const timeLabel = (value: string) => new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })

/** Today's messages show the time, older ones the date, like a phone's message list. */
export function listTimeLabel(value: string): string {
  const day = new Date(value)
  return sameDay(day, new Date()) ? timeLabel(value) : day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export function groupByDay(messages: ChatMessage[]): { label: string; key: string; messages: ChatMessage[] }[] {
  const groups: { label: string; key: string; messages: ChatMessage[] }[] = []
  for (const message of messages) {
    const key = new Date(message.createdAt).toDateString()
    const last = groups.at(-1)
    if (last?.key === key) last.messages.push(message)
    else groups.push({ key, label: dayLabel(message.createdAt), messages: [message] })
  }
  return groups
}

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AY'

/** Booking updates read "Request #12 accepted…"; the number becomes the label of the ticket stub. */
export function splitBookingNote(body: string): { ticket: string | null; text: string } {
  const match = body.match(/^Request #(\d+)[:.]?\s*/)
  return match ? { ticket: `#${match[1]}`, text: body.slice(match[0].length) || body } : { ticket: null, text: body }
}
