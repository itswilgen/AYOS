import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION } from '../components/common/CookieNotice'

// jsdom has no layout: pages may scroll things into view or ask about reduced motion, so give them no-op answers.
Element.prototype.scrollIntoView = vi.fn()
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
})) as typeof window.matchMedia

// Every test starts as a returning visitor who has seen the cookie notice; its own tests clear this.
beforeEach(() => {
  window.localStorage.setItem(COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
