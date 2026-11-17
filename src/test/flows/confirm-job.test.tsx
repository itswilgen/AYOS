import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MyRequestsPage from '../../features/services/MyRequestsPage'
import type { CustomerRequest } from '../../types/marketplace'
import { fakeServer } from '../fake-server'
import { request } from '../fixtures'

const finished = request({ id: 12, request_status: 'accepted', job_id: 31, job_status: 'provider_finished' })

/** The server's view of the job, changing as the customer confirms and reviews it, like the real API. */
function jobServer(confirmReply: { status?: number; body?: unknown } = { body: { status: 'completed' } }) {
  let job: CustomerRequest = finished
  return fakeServer({
    'GET /api/customer/requests': () => ({ body: { data: [job] } }),
    'POST /api/customer/jobs/31/confirm': () => {
      if ((confirmReply.status ?? 200) < 300) job = { ...job, job_status: 'completed', completed_at: '2026-11-17 02:00:00' }
      return confirmReply
    },
    'POST /api/customer/jobs/31/review': (call) => {
      job = { ...job, review_id: 5, review_rating: (call.body as { rating: number }).rating }
      return { status: 201, body: { id: 5 } }
    },
  })
}

function openMyRequests() {
  render(<MemoryRouter initialEntries={['/my-requests']}><Routes><Route path="/my-requests" element={<MyRequestsPage />} /></Routes></MemoryRouter>)
}

describe('Confirming finished work', () => {
  it('confirms the job, then lets the customer rate it once', async () => {
    const server = jobServer()
    openMyRequests()
    const card = await screen.findByRole('article')
    expect(within(card).getByText('provider finished')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Confirm completed work' }))

    expect(await within(card).findByText('completed')).toBeInTheDocument()
    expect(server.sent('POST', '/api/customer/jobs/31/confirm')).toHaveLength(1)
    expect(within(card).queryByRole('button', { name: 'Confirm completed work' })).not.toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Write a review' }))
    await userEvent.click(within(card).getByLabelText('4 of 5 stars, Very good'))
    await userEvent.type(within(card).getByRole('textbox', { name: /Review/ }), 'Fixed the leak fast and cleaned up.')
    await userEvent.click(within(card).getByRole('button', { name: 'Submit review' }))

    // Once reviewed, the button is gone: one review per job.
    await expect.poll(() => within(card).queryByRole('button', { name: 'Write a review' })).toBeNull()
    expect(server.sent('POST', '/api/customer/jobs/31/review')[0].body).toEqual({ rating: 4, comment: 'Fixed the leak fast and cleaned up.' })
  })

  it('explains when the job can no longer be confirmed and keeps the card as it was', async () => {
    jobServer({ status: 409, body: { message: 'This job was already confirmed.' } })
    openMyRequests()
    const card = await screen.findByRole('article')

    await userEvent.click(within(card).getByRole('button', { name: 'Confirm completed work' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This job was already confirmed.')
    expect(within(card).getByText('provider finished')).toBeInTheDocument()
  })

  it('offers the confirm button only for finished work', async () => {
    fakeServer({ 'GET /api/customer/requests': { body: { data: [
      request({ id: 1, job_id: 1, job_status: 'in_progress' }),
      request({ id: 2, job_id: 2, job_status: 'scheduled', scheduled_at: '2026-11-18 01:00:00' }),
    ] } } })
    openMyRequests()

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Confirm completed work' })).not.toBeInTheDocument()
    // A scheduled visit shows its agreed time in Manila.
    expect(screen.getByText(/Wed, Nov 18, 9:00\sAM/)).toBeInTheDocument()
  })
})
