import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AuthProvider } from '../../lib/auth/AuthProvider'
import { fakeServer } from '../fake-server'
import { user } from '../fixtures'

/** Pretends AYOS was opened from the home screen (display-mode: standalone) or in a browser tab. */
function openedAs(mode: 'installed app' | 'browser tab') {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: mode === 'installed app' && query === '(display-mode: standalone)',
    media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList)
}

function openAyos(signedIn: boolean) {
  fakeServer({
    'GET /api/platform-state': { body: { maintenance_mode: false } },
    'GET /api/user': signedIn ? { body: user() } : { status: 401 },
  })
  render(<AuthProvider><MemoryRouter initialEntries={['/']}><App /></MemoryRouter></AuthProvider>)
}

describe('Opening the installed app', () => {
  it('starts on the login page, not the landing page', async () => {
    openedAs('installed app')
    openAyos(false)

    expect(await screen.findByRole('heading', { name: 'Good to see you again.' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /The right help/i })).not.toBeInTheDocument()
  })

  it('takes someone already signed in straight past login to Home', async () => {
    openedAs('installed app')
    openAyos(true)

    // The signed-in app shell (its Home links in the top and bottom navigation) appears; the login form never shows.
    expect((await screen.findAllByRole('link', { name: 'Home' }, { timeout: 3000 })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Good to see you again.' })).not.toBeInTheDocument()
  })

  it('still shows the landing page in a normal browser tab', async () => {
    openedAs('browser tab')
    openAyos(false)

    expect(await screen.findByRole('heading', { name: /The right help/i }, { timeout: 3000 })).toBeInTheDocument()
  })
})
