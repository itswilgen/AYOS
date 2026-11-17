import { useSyncExternalStore } from 'react'
import { messagesService } from '../../services/messages.service'
import type { InboxUnread } from '../../types/messages'
import { isLiveConnected, onConversationSignal } from '../realtime/live-chat'

/**
 * One shared unread poller for every badge on screen. It runs while at least one badge is mounted,
 * and threads call `refreshInboxUnread()` after marking messages read so badges clear straight away.
 */
const VISIBLE_INTERVAL = 45_000
const HIDDEN_INTERVAL = 120_000
/** While live chat is connected, signals refresh the badges and the timer is only a safety net. */
const LIVE_INTERVAL = 180_000

let counts: InboxUnread = { customer: 0, provider: 0 }
const listeners = new Set<() => void>()
let timer: number | undefined
let inFlight: Promise<void> | undefined

function schedule() {
  window.clearTimeout(timer)
  if (listeners.size) timer = window.setTimeout(() => void refreshInboxUnread(), isLiveConnected() ? LIVE_INTERVAL : document.hidden ? HIDDEN_INTERVAL : VISIBLE_INTERVAL)
}

export function refreshInboxUnread(): Promise<void> {
  inFlight ??= messagesService.unread().then((next) => {
    if (next.customer !== counts.customer || next.provider !== counts.provider) {
      counts = next
      listeners.forEach((listener) => listener())
    }
  }).catch(() => {}).finally(() => {
    inFlight = undefined
    schedule()
  })
  return inFlight
}

const onVisible = () => { if (!document.hidden) void refreshInboxUnread() }
let stopSignals: (() => void) | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible)
    stopSignals = onConversationSignal(() => void refreshInboxUnread())
    void refreshInboxUnread()
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      stopSignals?.()
    }
  }
}

export function useInboxUnread(): InboxUnread {
  return useSyncExternalStore(subscribe, () => counts)
}
