import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, CheckCheck, Flag, ShieldCheck, TicketCheck } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { usePolling } from '../../lib/hooks/usePolling'
import { isLiveConnected, joinTyping, onConnectionChange, onConversationSignal, useLiveConnected, type ConversationSignal } from '../../lib/realtime/live-chat'
import { refreshInboxUnread } from '../../lib/hooks/useInboxUnread'
import { messagesService } from '../../services/messages.service'
import type { ChatMessage, ChatSide, ChatThreadData } from '../../types/messages'
import MessageComposer from './MessageComposer'
import ReportMessageDialog from './ReportMessageDialog'
import { groupByDay, initials, splitBookingNote, timeLabel } from './chat-format'

type Props = {
  side: ChatSide
  conversationId: string
  backTo: string
  /** Called after this thread sends or receives, so the list can refresh its order and previews. */
  onActivity: () => void
  onRead: (conversationId: string) => void
}

const merge = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const known = new Set(current.map((message) => message.id))
  const added = incoming.filter((message) => !known.has(message.id))
  return added.length ? [...current, ...added].sort((a, b) => Number(a.id) - Number(b.id)) : current
}

/** Mount with `key={conversationId}` so switching threads starts from a clean state. */
export default function ChatThread({ side, conversationId, backTo, onActivity, onRead }: Props) {
  const [thread, setThread] = useState<ChatThreadData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [offline, setOffline] = useState(false)
  const [reporting, setReporting] = useState<ChatMessage | null>(null)
  const [unseen, setUnseen] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const readUpTo = useRef('')
  const lastId = thread?.messages.at(-1)?.id
  const live = useLiveConnected()
  const [typing, setTyping] = useState(false)
  const typingLink = useRef<{ typing: () => void; leave: () => void } | null>(null)

  useEffect(() => {
    let active = true
    messagesService.thread(side, conversationId).then(
      (data) => { if (active) { setThread(data); setStatus('ready') } },
      (cause) => { if (active) setStatus(cause instanceof ApiError && cause.status === 404 ? 'missing' : 'error') },
    )
    return () => { active = false }
  }, [side, conversationId, attempt])

  const absorb = (data: ChatThreadData) => {
    setThread((current) => current ? { conversation: data.conversation, messages: merge(current.messages, data.messages) } : data)
    if (data.messages.length) {
      onActivity()
      if (!nearBottom.current && data.messages.some((message) => !message.mine)) setUnseen((count) => count + data.messages.filter((message) => !message.mine).length)
    }
  }

  const fetchNew = async () => {
    try {
      absorb(await messagesService.thread(side, conversationId, lastId))
      setOffline(false)
    } catch { setOffline(true) }
  }
  // Live signals bring new messages at once; while connected the timer is only a safety net.
  usePolling(fetchNew, { interval: live ? 60_000 : 5000, enabled: status === 'ready' })

  const onSignal = useEffectEvent((signal: ConversationSignal) => {
    if (signal.conversationId !== conversationId || status !== 'ready') return
    if (signal.kind === 'read') {
      if (signal.side !== side) setThread((current) => current && Number(signal.messageId) > Number(current.conversation.seenUpTo)
        ? { ...current, conversation: { ...current.conversation, seenUpTo: signal.messageId } } : current)
      return
    }
    if (!lastId || Number(signal.messageId) > Number(lastId)) {
      if (signal.side !== side) setTyping(false)
      void fetchNew()
    }
  })
  useEffect(() => onConversationSignal((signal) => onSignal(signal)), [])

  // After the connection comes back, load whatever arrived while it was down.
  const catchUp = useEffectEvent(() => { if (status === 'ready') void fetchNew() })
  useEffect(() => onConnectionChange(() => { if (isLiveConnected()) catchUp() }), [])

  // "typing…": shown for a few seconds after each signal from the other side.
  useEffect(() => {
    if (!live) return
    let timer: number | undefined
    const link = joinTyping(conversationId, side, () => {
      setTyping(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setTyping(false), 4000)
    })
    typingLink.current = link
    return () => {
      link.leave()
      typingLink.current = null
      window.clearTimeout(timer)
      setTyping(false)
    }
  }, [live, conversationId, side])

  const markRead = useEffectEvent(() => {
    if (!lastId || document.hidden || readUpTo.current === lastId) return
    readUpTo.current = lastId
    messagesService.markRead(side, conversationId).then(() => { onRead(conversationId); void refreshInboxUnread() }, () => { readUpTo.current = '' })
  })
  useEffect(() => { markRead() }, [lastId])
  useEffect(() => {
    const onVisible = () => markRead()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useLayoutEffect(() => {
    const element = scroller.current
    if (element && nearBottom.current) element.scrollTop = element.scrollHeight
  }, [lastId, status])

  const onScroll = () => {
    const element = scroller.current
    if (!element) return
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
    if (nearBottom.current) setUnseen(0)
  }
  const jumpToLatest = () => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setUnseen(0)
  }

  const send = async (message: { body: string; image: File | null }) => {
    nearBottom.current = true
    absorb(await messagesService.send(side, conversationId, message))
  }

  if (status === 'loading') return <section className="chat-thread" aria-busy="true" aria-label="Loading conversation"><div className="chat-thread-head"><span className="chat-avatar chat-skeleton" /><span className="chat-skeleton chat-skeleton-line" /></div><div className="chat-scroll"><div className="chat-skeleton chat-skeleton-bubble" /><div className="chat-skeleton chat-skeleton-bubble is-mine" /><div className="chat-skeleton chat-skeleton-bubble" /></div></section>
  if (status !== 'ready' || !thread) return <section className="chat-thread chat-thread-state" role="alert">
    <strong>{status === 'missing' ? 'Conversation not found' : 'This conversation didn’t load'}</strong>
    <p>{status === 'missing' ? 'It may have been removed, or it belongs to another account.' : 'Check your connection, then try again.'}</p>
    {status === 'missing' ? <Link className="chat-text-button" to={backTo}>Back to messages</Link> : <button type="button" className="chat-text-button" onClick={() => { setStatus('loading'); setAttempt((count) => count + 1) }}>Try again</button>}
  </section>

  const { conversation, messages } = thread
  const counterpart = conversation.counterpart
  // "Seen" sits under your newest message once the other side has read it.
  const lastMine = [...messages].reverse().find((message) => message.mine)
  const seenId = lastMine && Number(lastMine.id) <= Number(conversation.seenUpTo) ? lastMine.id : null
  const profileLink = side === 'customer' && counterpart.providerId ? `/providers/${counterpart.providerId}` : null

  return <section className="chat-thread" aria-label={`Conversation with ${counterpart.name}`}>
    <header className="chat-thread-head">
      <Link className="chat-back" to={backTo} aria-label="Back to all messages"><ArrowLeft size={19} aria-hidden="true" /></Link>
      <span className="chat-avatar" aria-hidden="true">{counterpart.photo ? <img src={counterpart.photo} alt="" /> : initials(counterpart.name)}</span>
      <div className="chat-thread-title"><h2>{counterpart.name}</h2><span>{side === 'provider' ? 'Customer' : 'Service provider'}</span></div>
      {profileLink && <Link className="chat-text-button chat-thread-profile" to={profileLink}>View profile</Link>}
    </header>
    {!conversation.contactShared && <p className="chat-guard"><ShieldCheck size={15} aria-hidden="true" />Phone numbers, emails and chat links stay hidden until a booking is accepted.</p>}
    {offline && <p className="chat-offline" role="status">Reconnecting… new messages will appear when you’re back online.</p>}
    <div className="chat-scroll" ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions">
      {!messages.length && <div className="chat-empty"><strong>Start the conversation</strong><p>{side === 'customer' ? 'Describe the problem, ask about rates or check when they’re free. You can add a photo of the issue.' : 'Introduce yourself and ask what the customer needs.'}</p></div>}
      {groupByDay(messages).map((group) => <div className="chat-day" key={group.key}>
        <p className="chat-day-label"><span>{group.label}</span></p>
        {group.messages.map((message) => message.role === 'system'
          ? <SystemNote key={message.id} message={message} />
          : <Bubble key={message.id} message={message} seen={message.id === seenId} onReport={() => setReporting(message)} />)}
      </div>)}
    </div>
    {unseen > 0 && <button type="button" className="chat-jump" onClick={jumpToLatest}><ArrowDown size={15} aria-hidden="true" />{unseen === 1 ? '1 new message' : `${unseen} new messages`}</button>}
    {typing && <p className="chat-typing" role="status"><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>{counterpart.name} is typing…</p>}
    {conversation.canSend
      ? <MessageComposer disabled={false} onSend={send} onTyping={() => typingLink.current?.typing()} />
      : <p className="chat-closed">{side === 'customer' ? 'This provider can’t receive messages right now. Your conversation is saved here.' : 'Messaging is paused while your provider account is under review.'}</p>}
    {reporting && <ReportMessageDialog message={reporting} onClose={() => setReporting(null)} />}
  </section>
}

function SystemNote({ message }: { message: ChatMessage }) {
  const { ticket, text } = splitBookingNote(message.body ?? '')
  return <div className="chat-note"><span className="chat-note-stub">{ticket ? <><small>REQUEST</small>{ticket}</> : <TicketCheck size={16} aria-label="Booking update" />}</span><p>{text}</p><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div>
}

function Bubble({ message, seen, onReport }: { message: ChatMessage; seen: boolean; onReport: () => void }) {
  return <div className={`chat-message${message.mine ? ' is-mine' : ''}`}>
    <div className={`chat-bubble${message.hidden ? ' is-hidden' : ''}${message.image && !message.body ? ' is-photo' : ''}`}>
      {message.hidden ? <p>Message removed by AYOS</p> : <>
        {message.image && <a className="chat-photo" href={message.image} target="_blank" rel="noreferrer"><img src={message.image} alt={message.mine ? 'Photo you sent' : 'Photo they sent'} loading="lazy" /></a>}
        {message.body && <p>{message.body}</p>}
      </>}
    </div>
    <div className="chat-message-meta">
      <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
      {seen && <span className="chat-seen"><CheckCheck size={13} aria-hidden="true" />Seen</span>}
      {message.masked && <span className="chat-masked">{message.mine ? 'Contact details hidden until booking' : 'Contact details hidden'}</span>}
      {!message.mine && !message.hidden && <button type="button" className="chat-report" onClick={onReport}><Flag size={12} aria-hidden="true" />Report</button>}
    </div>
  </div>
}
