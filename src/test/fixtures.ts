import type { CustomerRequest } from '../types/marketplace'

/** A customer request with sensible defaults; each test overrides only what it is about. */
export function request(overrides: Partial<CustomerRequest> = {}): CustomerRequest {
  return {
    id: 1, description: 'Kitchen sink leaks', preferred_at: '2026-11-20 01:00:00', request_status: 'new',
    created_at: '2026-11-10 01:00:00', provider_name: 'Jun Reyes Plumbing', service: 'Plumbing', provider_id: 9,
    job_id: null, job_status: null, completed_at: null, review_id: null, review_rating: null, repeat_of: null,
    scheduled_at: null, reschedule_by: null, reschedule_at: null, reschedule_reason: null,
    ...overrides,
  }
}
