import type { CustomerRequest } from '../../types/marketplace'
import { visitTime } from '../jobs/reschedule'

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
      if (request.reschedule_by && request.reschedule_at) {
        return request.reschedule_by === 'provider'
          ? { step: 2, status: 'New time asked', note: `${provider} asked to move the visit to ${visitTime(request.reschedule_at)}.`, action: 'Answer new time' }
          : { step: 2, status: 'Visit scheduled', note: `You asked to move the visit to ${visitTime(request.reschedule_at)}. Waiting for ${provider}.`, action: null }
      }
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

export type NeedsYouKind = 'confirm' | 'reschedule' | 'message' | 'review'

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
  // The provider asked to move a visit: the old time stands until the customer answers, so this comes early.
  const reschedules = requests.filter((request) => request.job_status === 'scheduled' && request.reschedule_by === 'provider' && request.reschedule_at)
    .map((request): NeedsYouItem => ({
      key: `reschedule-${request.id}`, kind: 'reschedule', label: 'New time asked',
      title: `${request.service} · ${request.provider_name}`,
      detail: `Move the visit to ${visitTime(request.reschedule_at!)}?`,
      action: 'Answer', href: `/my-requests#request-${request.id}`,
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

  return [...confirm, ...reschedules, ...messages, ...reviews]
}

export type PastProvider = {
  providerId: number
  name: string
  /** The service from their most recent finished job, preselected when booking again. */
  service: string
  lastDone: string | null
  /** The stars this customer gave them most recently, if they left a review. */
  rating: number | null
}

/** Providers who finished a job for this customer, most recent first, once each. */
export function pastProviders(requests: CustomerRequest[], limit = 4): PastProvider[] {
  const finished = requests.filter((request) => request.job_status === 'completed')
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))
  const byProvider = new Map<number, PastProvider>()
  for (const request of finished) {
    const known = byProvider.get(request.provider_id)
    if (known) {
      known.rating ??= request.review_rating
      continue
    }
    byProvider.set(request.provider_id, { providerId: request.provider_id, name: request.provider_name, service: request.service,
      lastDone: request.completed_at, rating: request.review_rating })
  }
  return [...byProvider.values()].slice(0, limit)
}

/** The request form for this provider, with their last service picked and the "book again" wording. */
export const bookAgainPath = (provider: PastProvider) =>
  `/services/request/${provider.providerId}?${new URLSearchParams({ service: provider.service, again: '1' })}`

