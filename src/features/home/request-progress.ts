import type { CustomerRequest } from '../../types/marketplace'

export const REQUEST_STEPS = ['Sent', 'Accepted', 'Scheduled', 'In progress', 'Done'] as const

export type RequestProgress = {
  step: number
  status: string
  note: string
  action: string | null
}

/** Where an open request stands from the customer's side, or null once it is closed (a missing review is a "Needs you" item, not an open request). */
export function requestProgress(request: CustomerRequest): RequestProgress | null {
  const provider = request.provider_name
  switch (request.job_status) {
    case 'accepted':
      return { step: 1, status: 'Accepted', note: `${provider} accepted your request and will confirm a visit time.`, action: null }
    case 'scheduled':
      return { step: 2, status: 'Visit scheduled', note: `${provider} has scheduled the visit.`, action: null }
    case 'in_progress':
      return { step: 3, status: 'Work in progress', note: `${provider} is working on it now.`, action: null }
    case 'provider_finished':
      return { step: 4, status: 'Ready for your check', note: `${provider} marked the work finished. Check it, then confirm.`, action: 'Confirm work done' }
    case null:
      return request.request_status === 'new'
        ? { step: 0, status: 'Waiting for a reply', note: `Sent to ${provider}. We’ll notify you when they reply.`, action: null }
        : null
    default:
      return null
  }
}

/** Work that needs the customer comes first, then whatever is furthest along. */
const PRIORITY = ['provider_finished', 'in_progress', 'scheduled', 'accepted', 'new']

export function openRequests(requests: CustomerRequest[]) {
  return requests
    .map((request) => ({ request, progress: requestProgress(request) }))
    .filter((item): item is { request: CustomerRequest; progress: RequestProgress } => item.progress !== null)
    .sort((a, b) => PRIORITY.indexOf(a.request.job_status ?? a.request.request_status) - PRIORITY.indexOf(b.request.job_status ?? b.request.request_status))
}

export type NeedsYouKind = 'confirm' | 'message' | 'review'

export type NeedsYouItem = {
  key: string
  kind: NeedsYouKind
  /** Short label of what to do, e.g. "Confirm the work". */
  label: string
  title: string
  detail: string
  action: string
  href: string
}

/** A conversation as far as Home needs it (kept loose so Home does not depend on the chat types). */
type UnreadConversation = { id: string; unread: number; counterpart: { name: string }; lastMessage: { preview: string; mine: boolean } | null }

/**
 * Everything waiting on the customer, most blocking first: finished work to confirm, unread messages, then reviews.
 * Each item links to the exact request or chat where the customer can act.
 */
export function needsYouItems(requests: CustomerRequest[], conversations: UnreadConversation[]): NeedsYouItem[] {
  const confirm = requests.filter((request) => request.job_status === 'provider_finished').map((request): NeedsYouItem => ({
    key: `confirm-${request.id}`, kind: 'confirm', label: 'Confirm the work',
    title: `${request.service} · ${request.provider_name}`,
    detail: 'Marked finished. Check the work, then confirm it.',
    action: 'Confirm work', href: `/my-requests#request-${request.id}`,
  }))
  const messages = conversations.filter((conversation) => conversation.unread > 0).map((conversation): NeedsYouItem => ({
    key: `message-${conversation.id}`, kind: 'message',
    label: conversation.unread === 1 ? 'New message' : `${conversation.unread} new messages`,
    title: conversation.counterpart.name,
    detail: conversation.lastMessage && !conversation.lastMessage.mine ? conversation.lastMessage.preview : 'Open the chat to read it.',
    action: 'Reply', href: `/messages/${conversation.id}`,
  }))
  const reviews = requests.filter((request) => request.job_status === 'completed' && !request.review_id).map((request): NeedsYouItem => ({
    key: `review-${request.id}`, kind: 'review', label: 'Leave a review',
    title: `${request.service} · ${request.provider_name}`,
    detail: `How did ${request.provider_name} do? Your review helps neighbours choose.`,
    action: 'Write a review', href: `/my-requests#request-${request.id}`,
  }))

  return [...confirm, ...messages, ...reviews]
}
