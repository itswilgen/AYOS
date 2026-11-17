import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no layout: pages may scroll things into view or ask about reduced motion, so give them no-op answers.
Element.prototype.scrollIntoView = vi.fn()
window.matchMedia ??= ((query: string) => ({
  matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
})) as typeof window.matchMedia

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
