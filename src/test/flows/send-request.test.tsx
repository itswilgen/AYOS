import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CustomerRequestPage from '../../features/services/CustomerRequestPage'
import { fakeServer } from '../fake-server'

const provider = {
  id: '9', displayName: 'Jun Reyes Plumbing', specialties: ['Carpentry', 'Plumbing'], startingPrices: { Plumbing: 650 },
  serviceAreaLabel: 'City of Tanjay', rating: 4.8, reviewCount: 4, completedServices: 6, verified: true, photo: null,
}
const categories = [
  { id: 1, slug: 'carpentry', name: 'Carpentry', description: 'Woodwork' },
  { id: 2, slug: 'plumbing', name: 'Plumbing', description: 'Pipes and leaks' },
  { id: 3, slug: 'electrical', name: 'Electrical', description: 'Wiring' },
]
const home = {
  id: 3, label: 'Home', is_default: true, region: { code: '07', name: 'Region VII' }, province: { code: '0746', name: 'Negros Oriental' },
  city_municipality: { code: '0746220', name: 'City of Tanjay', type: 'city' }, barangay: { code: '1', name: 'Poblacion' },
  address_line: 'Purok 3', landmark: null, postal_code: null,
}

function api(locations = [home], send: { status?: number; body?: unknown } = { status: 201, body: { id: 40 } }) {
  return fakeServer({
    'GET /api/providers': { body: { data: [provider] } },
    'GET /api/service-categories': { body: { data: categories } },
    'GET /api/me/service-locations': { body: { data: locations } },
    'POST /api/customer/requests': send,
  })
}

function openForm(path = '/services/request/9?service=Plumbing') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/services/request/:providerId" element={<CustomerRequestPage />} />
    <Route path="/my-requests" element={<h1>My requests</h1>} />
  </Routes></MemoryRouter>)
}

async function describeJob(container: HTMLElement) {
  await userEvent.type(screen.getByRole('textbox', { name: /What needs doing/ }), 'Kitchen sink leaks under the cabinet.')
  fireEvent.change(container.querySelector('input[type="datetime-local"]')!, { target: { value: '2026-11-20T09:00' } })
  await userEvent.click(screen.getByRole('button', { name: 'Send request' }))
}

describe('Sending a request', () => {
  it('sends what the customer chose and opens My requests', async () => {
    const server = api()
    const { container } = openForm()

    // Arrives ready: the service from the link, its price guide, and the default address.
    expect(await screen.findByDisplayValue('Plumbing · From ₱650')).toBeInTheDocument()
    expect(screen.getByText(/usually starts from/)).toHaveTextContent('Jun Reyes Plumbing usually starts from ₱650')
    expect(screen.getByDisplayValue('Home · City of Tanjay')).toBeInTheDocument()
    // Only services this provider offers can be picked.
    expect(screen.queryByRole('option', { name: /Electrical/ })).not.toBeInTheDocument()

    await describeJob(container)

    expect(await screen.findByRole('heading', { name: 'My requests' })).toBeInTheDocument()
    const [sent] = server.sent('POST', '/api/customer/requests')
    expect(sent.body).toMatchObject({
      providerId: '9', category: 'plumbing', serviceLocationId: '3', description: 'Kitchen sink leaks under the cabinet.',
      // 9 AM in Manila is 1 AM UTC: the server always receives UTC.
      preferredAt: '2026-11-20T01:00:00.000Z',
    })
    expect(sent.headers.get('X-XSRF-TOKEN')).toBe('test-xsrf')
  })

  it('shows why the server refused and keeps what the customer typed', async () => {
    api([home], { status: 503, body: { message: 'Customer requests are temporarily unavailable.' } })
    const { container } = openForm()
    await screen.findByDisplayValue('Plumbing · From ₱650')

    await describeJob(container)

    // A server error shows a general message (details are kept for 4xx answers only).
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t complete that request. Please try again.')
    expect(screen.getByRole('textbox', { name: /What needs doing/ })).toHaveValue('Kitchen sink leaks under the cabinet.')
    expect(screen.queryByRole('heading', { name: 'My requests' })).not.toBeInTheDocument()
  })

  it('shows a validation message from the server', async () => {
    api([home], { status: 422, body: { message: 'The preferred at field must be a date after now.' } })
    const { container } = openForm()
    await screen.findByDisplayValue('Plumbing · From ₱650')

    await describeJob(container)

    expect(await screen.findByRole('alert')).toHaveTextContent('The preferred at field must be a date after now.')
  })

  it('asks for an address first when the customer has none saved', async () => {
    const server = api([])
    openForm()

    expect(await screen.findByRole('link', { name: 'Add an address' })).toHaveAttribute('href', '/account/locations?add=1')
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled()
    expect(server.sent('POST', '/api/customer/requests')).toHaveLength(0)
  })

  it('words the page for booking the same provider again', async () => {
    api()
    openForm('/services/request/9?service=Plumbing&again=1')

    expect(await screen.findByRole('heading', { name: 'Request again' })).toBeInTheDocument()
    expect(screen.getByText('Book Jun Reyes Plumbing again. Tell them what needs fixing this time.')).toBeInTheDocument()
  })
})
