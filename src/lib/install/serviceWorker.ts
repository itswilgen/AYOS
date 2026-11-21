/**
 * Registers public/sw.js, which makes AYOS installable and shows public/offline.html when a page can't load.
 * Waits for the page to finish loading, so it never competes with the first screen.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      // AYOS still works; it just can't be installed or show the offline page in this browser.
      console.warn('AYOS could not register its service worker.', error)
    })
  }
  // If the page already finished loading (for example after a hot reload), waiting for "load" would wait forever.
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
