import { useSyncExternalStore } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { apiRequest } from '../api/client'
import type { ChatSide } from '../../types/messages'

/**
 * Live chat over Reverb. The socket only carries small signals (ids); pages load the messages through the
 * normal API. While connected, pages poll rarely; when the socket drops they go back to fast polling, so
 * chat keeps working without it.
 */

export type ConversationSignal = {
  conversationId: string
  kind: 'message' | 'read'
  /** Who sent the message, or who read. */
  side: ChatSide | 'system'
  messageId: string
}

const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined
const scheme = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'https'
const port = Number(import.meta.env.VITE_REVERB_PORT ?? (scheme === 'https' ? 443 : 80))

let echo: Echo<'reverb'> | null = null
let connected = false
const statusListeners = new Set<() => void>()
const signalListeners = new Set<(signal: ConversationSignal) => void>()

function setConnected(next: boolean) {
  if (next === connected) return
  connected = next
  statusListeners.forEach((listener) => listener())
}

/** Opens the live connection for a signed-in user. Without a configured key, chat simply keeps polling. */
export function connectLiveChat(userId: number) {
  if (!key || echo) return
  echo = new Echo({
    broadcaster: 'reverb',
    key,
    Pusher,
    wsHost: import.meta.env.VITE_REVERB_HOST as string | undefined ?? window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    // Channel access is checked by the API with the normal signed-in session.
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        apiRequest<{ auth: string }>('/broadcasting/auth', { method: 'POST', body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }) })
          .then((data) => callback(null, data), (error: Error) => callback(error, null))
      },
    }),
  })
  echo.connector.pusher.connection.bind('state_change', ({ current }: { current: string }) => setConnected(current === 'connected'))
  echo.private(`user.${userId}`).listen('.conversation.updated', (signal: ConversationSignal) => {
    signalListeners.forEach((listener) => listener(signal))
  })
}

export function disconnectLiveChat() {
  echo?.disconnect()
  echo = null
  setConnected(false)
}

export function isLiveConnected(): boolean {
  return connected
}

/** Re-renders when the live connection comes up or drops. */
export function useLiveConnected(): boolean {
  return useSyncExternalStore((listener) => {
    statusListeners.add(listener)
    return () => { statusListeners.delete(listener) }
  }, () => connected)
}

export function onConnectionChange(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => { statusListeners.delete(listener) }
}

/** Every new message or read in the user's conversations. Returns the unsubscribe function. */
export function onConversationSignal(listener: (signal: ConversationSignal) => void): () => void {
  signalListeners.add(listener)
  return () => { signalListeners.delete(listener) }
}

/**
 * Typing in one conversation: `typing()` tells the other side, `onTyping` hears them. Nothing is stored.
 * Returns a no-op pair while the live connection is off.
 */
export function joinTyping(conversationId: string, side: ChatSide, onTyping: () => void): { typing: () => void; leave: () => void } {
  if (!echo) return { typing: () => {}, leave: () => {} }
  const name = `conversation.${conversationId}`
  const channel = echo.private(name)
  channel.listenForWhisper('typing', (event: { side: ChatSide }) => { if (event.side !== side) onTyping() })
  let lastSent = 0
  return {
    typing: () => {
      const now = Date.now()
      if (now - lastSent < 2500) return
      lastSent = now
      channel.whisper('typing', { side })
    },
    leave: () => echo?.leave(name),
  }
}
