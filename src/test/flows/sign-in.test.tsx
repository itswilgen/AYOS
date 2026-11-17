import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../lib/auth/AuthProvider'
import LoginPage from '../../pages/LoginPage'
import { fakeServer } from '../fake-server'
import { user } from '../fixtures'

// The real reCAPTCHA loads Google's script; this stand-in is a button that "solves" it, and records resets.
const captchaReset = vi.hoisted(() => vi.fn())
vi.mock('react-google-recaptcha', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef<{ reset: () => void }, { onChange: (token: string | null) => void }>(function FakeCaptcha({ onChange }, ref) {
      useImperativeHandle(ref, () => ({ reset: captchaReset }))
      return <button type="button" onClick={() => onChange('test-captcha')}>I’m not a robot</button>
    }),
  }
})
// Live chat is not part of signing in.
vi.mock('../../lib/realtime/live-chat', () => ({ connectLiveChat: vi.fn(), disconnectLiveChat: vi.fn() }))

function openLogin() {
  render(<AuthProvider><MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/home" element={<h1>Customer home</h1>} />
    <Route path="/verify-email" element={<h1>Verify your email</h1>} />
  </Routes></MemoryRouter></AuthProvider>)
}

async function fillIn(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText('Email address'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
}

describe('Signing in', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key')
    captchaReset.mockClear()
  })

  it('takes a customer from the sign-in form to Home', async () => {
    let signedIn = false
    const server = fakeServer({
      'GET /api/user': () => signedIn ? { body: user() } : { status: 401, body: { message: 'Unauthenticated.' } },
      'POST /login': () => { signedIn = true; return { status: 204 } },
    })
    openLogin()

    await fillIn('lea@example.test', 'correct-horse-battery')
    await userEvent.click(screen.getByRole('button', { name: 'I’m not a robot' }))
    await userEvent.click(screen.getByRole('button', { name: /^Sign in/ }))

    expect(await screen.findByRole('heading', { name: 'Customer home' })).toBeInTheDocument()
    const [login] = server.sent('POST', '/login')
    expect(login.body).toEqual({ email: 'lea@example.test', password: 'correct-horse-battery', remember: true, captcha_token: 'test-captcha' })
    // Sanctum's CSRF protection: the cookie is fetched first and sent back with the login.
    expect(login.headers.get('X-XSRF-TOKEN')).toBe('test-xsrf')
  })

  it('shows the server’s message for a wrong password and asks for the CAPTCHA again', async () => {
    const server = fakeServer({
      'GET /api/user': { status: 401 },
      'POST /login': { status: 422, body: { message: 'Invalid.', errors: { email: ['These credentials do not match our records.'] } } },
    })
    openLogin()

    await fillIn('lea@example.test', 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'I’m not a robot' }))
    await userEvent.click(screen.getByRole('button', { name: /^Sign in/ }))

    expect(await screen.findByText('These credentials do not match our records.')).toBeInTheDocument()
    expect(captchaReset).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Customer home' })).not.toBeInTheDocument()

    // A used CAPTCHA token can't be sent twice: the next try must solve it again.
    await userEvent.click(screen.getByRole('button', { name: /^Sign in/ }))
    expect(await screen.findByText('Please complete the CAPTCHA verification.')).toBeInTheDocument()
    expect(server.sent('POST', '/login')).toHaveLength(1)
  })

  it('sends a customer who has not verified their email to the verify page', async () => {
    let signedIn = false
    fakeServer({
      'GET /api/user': () => signedIn ? { body: user({ email_verified: false }) } : { status: 401 },
      'POST /login': () => { signedIn = true; return { status: 204 } },
    })
    openLogin()

    await fillIn('lea@example.test', 'correct-horse-battery')
    await userEvent.click(screen.getByRole('button', { name: 'I’m not a robot' }))
    await userEvent.click(screen.getByRole('button', { name: /^Sign in/ }))

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
  })

  it('checks the form before sending anything', async () => {
    const server = fakeServer({ 'GET /api/user': { status: 401 } })
    openLogin()

    await fillIn('not-an-email', 'x')
    await userEvent.click(screen.getByRole('button', { name: /^Sign in/ }))

    expect(await screen.findByText('Enter a valid AYOS email address.')).toBeInTheDocument()
    expect(screen.getByText('Please complete the CAPTCHA verification.')).toBeInTheDocument()
    expect(server.sent('POST', '/login')).toHaveLength(0)
  })
})
