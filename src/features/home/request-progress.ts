import type { CustomerRequest } from '../../types/marketplace'

export const REQUEST_STEPS = ['Sent', 'Accepted', 'Scheduled', 'In progress', 'Done'] as const

export type RequestProgress = {
  step: number
  status: string
  note: string
  action: string | null
}

/** Where a request stands from the customer's side, or null once it needs nothing more from them. */
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
    case 'completed':
      return request.review_id ? null : { step: 4, status: 'Completed', note: `How did ${provider} do? Your review helps neighbours choose.`, action: 'Leave a review' }
    case null:
      return request.request_status === 'new'
        ? { step: 0, status: 'Waiting for a reply', note: `Sent to ${provider}. We’ll notify you when they reply.`, action: null }
        : null
    default:
      return null
  }
}

/** Work that needs the customer comes first, then whatever is furthest along. */
const PRIORITY = ['provider_finished', 'in_progress', 'scheduled', 'accepted', 'new', 'completed']

export function openRequests(requests: CustomerRequest[]) {
  return requests
    .map((request) => ({ request, progress: requestProgress(request) }))
    .filter((item): item is { request: CustomerRequest; progress: RequestProgress } => item.progress !== null)
    .sort((a, b) => PRIORITY.indexOf(a.request.job_status ?? a.request.request_status) - PRIORITY.indexOf(b.request.job_status ?? b.request.request_status))
}
