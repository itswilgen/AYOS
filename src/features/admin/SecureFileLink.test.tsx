import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SecureFileLink from './SecureFileLink'

const PATH = '/admin/provider-applications/11/documents/1'

/** A stand-in for the browser tab that "Open securely" opens during the click. */
function fakeTab() {
  return { opener: {} as unknown, document: { title: '', body: { textContent: '' } }, location: { href: '' }, close: vi.fn() }
}

function serve(response: Response) {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

let tab: ReturnType<typeof fakeTab>
beforeEach(() => {
  tab = fakeTab()
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  URL.createObjectURL = vi.fn(() => 'blob:ayos/file-1')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('Open securely', () => {
  it('loads the file with the admin’s sign-in and shows a photo in the new tab', async () => {
    const fetchMock = serve(new Response(new Blob(['png'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } }))
    render(<SecureFileLink path={PATH} fileName="id-front.png" />)

    await userEvent.click(screen.getByRole('button', { name: 'Open securely' }))

    // A real API call with the session cookie, not a bare link the API would treat as signed out.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe(`/api${PATH}`)
    expect(init.credentials).toBe('include')
    await expect.poll(() => tab.location.href).toBe('blob:ayos/file-1')
    expect(tab.opener).toBeNull()
    expect(tab.close).not.toHaveBeenCalled()
  })

  it('closes the tab and explains when the session has ended', async () => {
    serve(new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
    render(<SecureFileLink path={PATH} fileName="id-front.png" />)

    await userEvent.click(screen.getByRole('button', { name: 'Open securely' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended. Sign in again, then open the file.')
    expect(tab.close).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open securely' })).toBeEnabled()
  })

  it('downloads files that could run code (like SVG) instead of showing them', async () => {
    serve(new Response(new Blob(['<svg/>'], { type: 'image/svg+xml' }), { headers: { 'Content-Type': 'image/svg+xml' } }))
    const clicked: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download) })
    render(<SecureFileLink path={PATH} fileName="drawing.svg" />)

    await userEvent.click(screen.getByRole('button', { name: 'Open securely' }))

    await expect.poll(() => clicked).toEqual(['drawing.svg'])
    expect(tab.location.href).toBe('')
    expect(tab.close).toHaveBeenCalled()
  })
})
