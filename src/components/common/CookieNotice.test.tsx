import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AuthProvider } from '../../lib/auth/AuthProvider'
import { fakeServer } from '../../test/fake-server'
import CookieNotice, { COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION } from './CookieNotice'

let root: HTMLDivElement

/** Renders into a #root like index.html, so we can see the page behind the notice being blocked. */
function visit(path: string, ui = <CookieNotice />) {
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>, { container: root })
}

beforeEach(() => {
  window.localStorage.removeItem(COOKIE_NOTICE_KEY) // a first-time visitor (the shared setup marks it as seen)
  root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
})
afterEach(() => {
  root.remove()
  document.body.classList.remove('cookie-notice-open')
  vi.restoreAllMocks()
})

describe('Cookie notice', () => {
  it('blocks the page on a first visit until "Got it", then never shows again in this browser', async () => {
    visit('/')

    const notice = screen.getByRole('dialog', { name: 'Only the cookies AYOS needs to work' })
    expect(notice).toHaveAttribute('aria-modal', 'true')
    expect(root).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveFocus()
    expect(screen.getByRole('link', { name: /Read the Cookie Policy/ })).toHaveAttribute('href', '/privacy#cookies')

    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(root).not.toHaveAttribute('inert')
    expect(document.body).not.toHaveClass('cookie-notice-open')
    expect(window.localStorage.getItem(COOKIE_NOTICE_KEY)).toBe(COOKIE_NOTICE_VERSION)
  })

  it('ignores a tap on the dimmed page and keeps focus on "Got it"', async () => {
    visit('/')
    const gotIt = screen.getByRole('button', { name: 'Got it' })

    await userEvent.click(document.querySelector('.cookie-notice-layer')!)

    expect(gotIt).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('stays away for someone who already saw this version', () => {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION)
    visit('/')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(root).not.toHaveAttribute('inert')
  })

  it('shows again when the cookies AYOS uses change (a new version)', () => {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, '0')
    visit('/home')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lets people read the Privacy Policy without being blocked, with room for its last lines', async () => {
    visit('/privacy')

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false')
    expect(root).not.toHaveAttribute('inert')
    expect(document.body).toHaveClass('cookie-notice-reading')
    // Already on the policy: no link pointing back to it.
    expect(screen.queryByRole('link', { name: /Read the Cookie Policy/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))

    expect(document.body).not.toHaveClass('cookie-notice-reading')
  })

  it('keeps the keyboard inside the notice while it blocks the page', async () => {
    visit('/')
    const gotIt = screen.getByRole('button', { name: 'Got it' })
    const policy = screen.getByRole('link', { name: /Read the Cookie Policy/ })

    await userEvent.tab()
    expect(policy).toHaveFocus()
    await userEvent.tab()
    expect(gotIt).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(policy).toHaveFocus()
  })

  it('still works when the browser blocks storage (it just asks again next visit)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    visit('/')

    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is part of the real app, on the landing page before anything else', async () => {
    fakeServer({
      'GET /api/platform-state': { body: { maintenance_mode: false } },
      'GET /api/user': { status: 401 },
    })
    visit('/', <AuthProvider><App /></AuthProvider>)

    expect(await screen.findByRole('dialog', { name: 'Only the cookies AYOS needs to work' })).toBeInTheDocument()
    expect(root).toHaveAttribute('inert')
  })
})
