import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessagesSquare } from 'lucide-react'
import { usePolling } from '../../lib/hooks/usePolling'
import { messagesService } from '../../services/messages.service'
import type { ChatSide, ConversationSummary } from '../../types/messages'
import ChatThread from './ChatThread'
import ConversationList from './ConversationList'
import './messages.css'

/** The inbox for either side. Desktop shows list and thread side by side; phones show one at a time. */
export default function MessagesPage({ side }: { side: ChatSide }) {
  const { conversationId } = useParams()
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const base = side === 'provider' ? '/provider/messages' : '/messages'

  const load = useCallback(async () => {
    try {
      setItems(await messagesService.list(side))
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [side])

  useEffect(() => {
    let active = true
    messagesService.list(side).then((result) => { if (active) setItems(result) }, () => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [side])
  usePolling(load, { interval: 20_000, hiddenInterval: 60_000 })

  const onRead = useCallback((id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item)), [])
  const onActivity = useCallback(() => { void load() }, [load])

  return <div className={`chat-page chat-page-${side}${conversationId ? ' has-thread' : ''}`}>
    <aside className="chat-sidebar" aria-label="Conversations">
      <div className="chat-sidebar-head"><span className="chat-eyebrow">{side === 'provider' ? 'CUSTOMER MESSAGES' : 'YOUR MESSAGES'}</span><h1>Messages</h1></div>
      <ConversationList side={side} items={items} activeId={conversationId} loading={loading} error={error} onRetry={() => { setLoading(true); void load() }} />
    </aside>
    {conversationId
      ? <ChatThread key={conversationId} side={side} conversationId={conversationId} backTo={base} onActivity={onActivity} onRead={onRead} />
      : <section className="chat-thread chat-thread-placeholder"><span className="chat-state-icon"><MessagesSquare size={22} aria-hidden="true" /></span><strong>Pick a conversation</strong><p>{side === 'provider' ? 'Reply quickly. Customers often choose the provider who answers first.' : 'Your conversations with providers stay here, next to your booking updates.'}</p></section>}
  </div>
}
