/*
 * AYOS service worker. Small on purpose: it makes AYOS installable and shows a friendly page when a
 * screen is opened without internet. It never caches API calls, requests, messages or account data,
 * so nothing a person sees can be out of date. Bump OFFLINE_CACHE when offline.html or its icon change.
 */
const OFFLINE_CACHE = 'ayos-offline-v1'
const OFFLINE_URL = '/offline.html'
const OFFLINE_ASSETS = [OFFLINE_URL, '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== OFFLINE_CACHE) await caches.delete(key)
    // Lets page loads start while the worker wakes up, so installing AYOS never makes it slower.
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // The offline page's own icon, when the network is gone.
  if (request.method === 'GET' && OFFLINE_ASSETS.includes(new URL(request.url).pathname) && new URL(request.url).origin === self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)))
    return
  }
  // Only page loads are handled; everything else goes to the network exactly as without a worker.
  if (request.mode !== 'navigate') return
  event.respondWith((async () => {
    try {
      return (await event.preloadResponse) || await fetch(request)
    } catch {
      return (await caches.match(OFFLINE_URL)) || Response.error()
    }
  })())
})
