import { useSyncExternalStore } from 'react'

/**
 * "Install app" support. Browsers fire `beforeinstallprompt` once, early (often before a lazy page loads),
 * and only when the site is installable (web manifest + service worker). This store starts listening when
 * main.tsx imports it, so the Install button can use the event whenever it mounts.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** prompt: the browser can install now · ios: Safari's Add to Home Screen · manual: browser menu · installed: running as the app. */
export type InstallState = 'prompt' | 'ios' | 'manual' | 'installed'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** True when AYOS runs as the installed app (home screen or desktop), not in a browser tab. */
export function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

function isAppleMobile(): boolean {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; touch support tells them apart.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

if (typeof window !== 'undefined') {
  installed = isInstalledApp()
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    notify()
  })
}

function snapshot(): InstallState {
  if (installed) return 'installed'
  if (deferred) return 'prompt'
  return isAppleMobile() ? 'ios' : 'manual'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Opens the browser's own install dialog. Resolves true when the person installs. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => 'manual')
}
