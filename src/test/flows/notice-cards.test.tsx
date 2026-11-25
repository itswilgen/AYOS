import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthenticatedHeader from '../../components/navigation/AuthenticatedHeader'
import { AuthProvider } from '../../lib/auth/AuthProvider'
import { fakeServer } from '../fake-server'
import { user } from '../fixtures'

const update = 'We added cover photos for services. Providers can now upload a photo of their work, and after a quick review it shows on the Home page for customers in their service area.'

function openBell() {
  const server = fakeServer({
    'GET /api/user': { body: user() },
    'GET /api/customer/notifications': { body: { data: [
      { id: '41', title: 'Cover photos are here', description: update, unread: true, href: '/home', category: 'notice', createdAtLabel: '2026-11-24 09:45:00' },
      { id: '42', title: 'Confirm the finished work', description: 'Juan Electrical Works finished your electrical job.', unread: true, href: '/my-requests#request-12', category: 'request', createdAtLabel: '2026-11-24 08:00:00' },
    ] } },
    'POST /api/customer/notifications/41/read': { status: 204 },
    'POST /api/customer/notifications/42/read': { status: 204 },
  })
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/home']}>
        <AuthenticatedHeader />
        <Routes><Route path="/home" element={<p>Home page</p>} /><Route path="/my-requests" element={<p>My requests page</p>} /></Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return server
}

describe('Notice cards in the bell', () => {
  it('opens a system update in place to show the whole message, and closes it on a second click', async () => {
    const server = openBell()
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    const notice = await screen.findByRole('button', { name: /Cover photos are here/ })
    expect(notice).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(notice)

    expect(notice).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(update)).toBeInTheDocument()
    // Opening it marks it read, and the person stays where they were with the bell still open.
    await expect.poll(() => server.sent('POST', '/api/customer/notifications/41/read')).toHaveLength(1)
    expect(screen.getByText('Home page')).toBeInTheDocument()

    await userEvent.click(notice)

    expect(notice).toHaveAttribute('aria-expanded', 'false')
    // Already read: closing it does not send another request.
    expect(server.sent('POST', '/api/customer/notifications/41/read')).toHaveLength(1)
  })

  it('still takes a request card straight to the request', async () => {
    openBell()
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    const card = await screen.findByRole('button', { name: /Confirm the finished work/ })
    expect(card).not.toHaveAttribute('aria-expanded')

    await userEvent.click(card)

    expect(await screen.findByText('My requests page')).toBeInTheDocument()
  })
})
