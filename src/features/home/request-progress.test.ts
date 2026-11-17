import { describe, expect, it } from 'vitest'
import { request } from '../../test/fixtures'
import { bookAgainPath, needsYouItems, openRequests, pastProviders, requestProgress } from './request-progress'

describe('requestProgress', () => {
  it('follows a request from sent to ready for the customer’s check', () => {
    expect(requestProgress(request())).toMatchObject({ step: 0, status: 'Waiting for a reply', action: null })
    expect(requestProgress(request({ job_status: 'accepted' }))).toMatchObject({ step: 1, status: 'Accepted' })
    expect(requestProgress(request({ job_status: 'scheduled' }))).toMatchObject({ step: 2, status: 'Visit scheduled' })
    expect(requestProgress(request({ job_status: 'in_progress' }))).toMatchObject({ step: 3, status: 'Work in progress' })
    expect(requestProgress(request({ job_status: 'provider_finished' }))).toMatchObject({ step: 4, action: 'Confirm work done' })
  })

  it('treats completed, cancelled and declined requests as closed', () => {
    // The bug this guards: completed jobs were once counted as "open".
    expect(requestProgress(request({ job_status: 'completed' }))).toBeNull()
    expect(requestProgress(request({ job_status: 'cancelled' }))).toBeNull()
    expect(requestProgress(request({ request_status: 'declined' }))).toBeNull()
  })

  it('asks the customer to answer only when the provider proposed a new time', () => {
    const byProvider = requestProgress(request({ job_status: 'scheduled', reschedule_by: 'provider', reschedule_at: '2026-11-19 06:00:00' }))
    expect(byProvider).toMatchObject({ status: 'New time asked', action: 'Answer new time' })
    expect(byProvider?.note).toMatch(/Thu, Nov 19, 2:00\sPM/)

    const byCustomer = requestProgress(request({ job_status: 'scheduled', reschedule_by: 'customer', reschedule_at: '2026-11-19 06:00:00' }))
    expect(byCustomer).toMatchObject({ status: 'Visit scheduled', action: null })
    expect(byCustomer?.note).toContain('Waiting for Jun Reyes Plumbing')
  })
})

describe('openRequests', () => {
  it('lists only open requests, the ones needing the customer first', () => {
    const open = openRequests([
      request({ id: 1 }),
      request({ id: 2, job_status: 'completed' }),
      request({ id: 3, job_status: 'scheduled' }),
      request({ id: 4, job_status: 'provider_finished' }),
      request({ id: 5, job_status: 'accepted' }),
    ])
    expect(open.map((item) => item.request.id)).toEqual([4, 3, 5, 1])
  })
})

describe('needsYouItems', () => {
  const conversation = (id: string, unread: number, mine = false) =>
    ({ id, unread, counterpart: { name: 'Jun' }, lastMessage: { preview: 'On my way', mine } })

  it('puts confirming work first, then new times, messages and reviews, each linking to the exact place', () => {
    const items = needsYouItems([
      request({ id: 1, job_status: 'completed' }),
      request({ id: 2, job_status: 'provider_finished' }),
      request({ id: 3, job_status: 'scheduled', reschedule_by: 'provider', reschedule_at: '2026-11-19 06:00:00' }),
      request({ id: 4, job_status: 'completed', review_id: 7 }),
    ], [conversation('8', 2), conversation('9', 0)])

    expect(items.map((item) => [item.kind, item.href])).toEqual([
      ['confirm', '/my-requests#request-2'],
      ['reschedule', '/my-requests#request-3'],
      ['message', '/messages/8'],
      ['review', '/my-requests#request-1'],
    ])
    expect(items[2]).toMatchObject({ label: '2 new messages', detail: 'On my way' })
  })

  it('does not preview the customer’s own last message as if it were new', () => {
    expect(needsYouItems([], [conversation('8', 1, true)])[0]).toMatchObject({ label: 'New message', detail: 'Open the chat to read it.' })
  })

  it('stays empty when nothing waits on the customer', () => {
    expect(needsYouItems([request({ job_status: 'scheduled', reschedule_by: 'customer', reschedule_at: '2026-11-19 06:00:00' })], [])).toEqual([])
  })
})

describe('pastProviders and Book again', () => {
  it('lists each provider once, most recent finished job first, with the customer’s latest rating', () => {
    const past = pastProviders([
      request({ id: 1, provider_id: 9, job_status: 'completed', completed_at: '2026-10-01 01:00:00', review_rating: 5, service: 'Carpentry' }),
      request({ id: 2, provider_id: 9, job_status: 'completed', completed_at: '2026-11-01 01:00:00', review_rating: null, service: 'Plumbing' }),
      request({ id: 3, provider_id: 4, provider_name: 'Marco Electrical Works', job_status: 'completed', completed_at: '2026-10-15 01:00:00', review_rating: 4 }),
      request({ id: 4, provider_id: 5, job_status: 'in_progress' }),
    ])
    expect(past.map((item) => [item.providerId, item.service, item.rating])).toEqual([
      // The latest job had no review, so the earlier rating fills in.
      [9, 'Plumbing', 5],
      [4, 'Plumbing', 4],
    ])
  })

  it('keeps at most the limit', () => {
    const many = [1, 2, 3, 4, 5, 6].map((id) => request({ id, provider_id: id, job_status: 'completed', completed_at: `2026-11-0${id} 01:00:00` }))
    expect(pastProviders(many).map((item) => item.providerId)).toEqual([6, 5, 4, 3])
  })

  it('opens the request form with the last service and the book-again flag', () => {
    expect(bookAgainPath({ providerId: 9, name: 'Jun', service: 'Appliance repair', lastDone: null, rating: null }))
      .toBe('/services/request/9?service=Appliance+repair&again=1')
  })
})
