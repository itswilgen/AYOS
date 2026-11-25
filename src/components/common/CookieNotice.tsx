import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './cookie-notice.css'

/**
 * Bump this when the cookies AYOS uses change (for example, if analytics are ever added), so everyone sees
 * the notice again. It must match what the Privacy Policy's "Cookies" section says.
 */
export const COOKIE_NOTICE_VERSION = '1'
export const COOKIE_NOTICE_KEY = 'ayos.cookie-notice'

/** The policy pages stay usable under the notice, so "Read the Cookie Policy" opens something people can read. */
const POLICY_PAGES = ['/privacy', '/terms']

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(COOKIE_NOTICE_KEY) === COOKIE_NOTICE_VERSION
  } catch {
    return false
  }
}

function rememberSeen(): void {
  try {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION)
  } catch {
    // Storage blocked (some private windows): the notice simply shows again on the next visit.
  }
}

/**
 * First-visit cookie notice. AYOS only uses cookies it needs to work (sign-in session, form security, and
 * Google reCAPTCHA's own on sign-in and sign-up), so this is a notice with one "Got it", not a consent
 * choice: there is nothing optional to switch off. Until it's acknowledged, the page behind it can't be
 * clicked, focused or read by a screen reader (the app root is made `inert`).
 */
export default function CookieNotice() {
  const [open, setOpen] = useState(() => !alreadySeen())
  const { pathname } = useLocation()
  const reading = POLICY_PAGES.includes(pathname)
  const sheet = useRef<HTMLDivElement>(null)
  const gotIt = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open || reading) return
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    document.body.classList.add('cookie-notice-open')
    gotIt.current?.focus()
    return () => {
      root?.removeAttribute('inert')
      document.body.classList.remove('cookie-notice-open')
    }
  }, [open, reading])

  // While someone reads a policy page, the page gets extra space at the bottom the size of the notice, so
  // its last lines can still scroll out from under it.
  useEffect(() => {
    if (!open || !reading || !sheet.current) return
    const body = document.body
    const fit = () => body.style.setProperty('--cookie-notice-space', `${sheet.current?.offsetHeight ?? 0}px`)
    fit()
    body.classList.add('cookie-notice-reading')
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit)
    observer?.observe(sheet.current)
    return () => {
      observer?.disconnect()
      body.classList.remove('cookie-notice-reading')
      body.style.removeProperty('--cookie-notice-space')
    }
  }, [open, reading])

  if (!open) return null

  const acknowledge = () => {
    rememberSeen()
    setOpen(false)
  }

  // Tab and Shift+Tab move between the two controls and never leave the notice while it blocks the page.
  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || reading || !sheet.current) return
    const controls = [...sheet.current.querySelectorAll<HTMLElement>('a[href], button')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={`cookie-notice-layer${reading ? ' is-reading' : ''}`}
      // A tap on the dimmed page does nothing and leaves focus on the notice's button.
      onMouseDown={(event) => { if (event.target === event.currentTarget) event.preventDefault() }}
    >
      <div
        ref={sheet}
        className="cookie-notice"
        role="dialog"
        aria-modal={!reading}
        aria-labelledby="cookie-notice-title"
        aria-describedby="cookie-notice-text"
        onKeyDown={keepFocusInside}
      >
        <div className="cookie-notice-inner">
          <div className="cookie-notice-text">
            <p className="cookie-notice-eyebrow">Cookies on AYOS</p>
            <h2 id="cookie-notice-title">Only the cookies AYOS needs to work</h2>
            <p id="cookie-notice-text">
              They keep you signed in and protect your forms. Google reCAPTCHA may add its own on sign-in and sign-up.
              No ads, no tracking.
            </p>
          </div>
          <div className="cookie-notice-actions">
            <button ref={gotIt} type="button" onClick={acknowledge}>
              Got it
            </button>
            {pathname !== '/privacy' && (
              <Link to="/privacy#cookies">
                Read the Cookie Policy <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
