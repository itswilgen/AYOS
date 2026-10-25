import { Link } from 'react-router-dom'
import { Camera, MessagesSquare } from 'lucide-react'
import type { ChatSide, ConversationSummary } from '../../types/messages'
import { initials, listTimeLabel } from './chat-format'

type Props = {
  side: ChatSide
  items: ConversationSummary[]
  activeId?: string
  loading: boolean
  error: boolean
  onRetry: () => void
}

export default function ConversationList({ side, items, activeId, loading, error, onRetry }: Props) {
  const base = side === 'provider' ? '/provider/messages' : '/messages'
  if (loading) return <ul className="chat-list" aria-busy="true" aria-label="Loading conversations">{[0, 1, 2, 3].map((item) => <li key={item} className="chat-list-skeleton"><span /><div><i /><i /></div></li>)}</ul>
  if (error && !items.length) return <div className="chat-list-state" role="alert"><strong>Conversations didn’t load</strong><p>Check your connection, then try again.</p><button type="button" className="chat-text-button" onClick={onRetry}>Try again</button></div>
  if (!items.length) return <div className="chat-list-state"><span className="chat-state-icon"><MessagesSquare size={20} aria-hidden="true" /></span><strong>No messages yet</strong>{side === 'provider'
    ? <p>When a customer writes from your profile, the conversation appears here. You can also message anyone who sent you a request.</p>
    : <><p>Open a provider’s profile and choose Message to ask about the job, price or schedule before you book.</p><Link className="chat-text-button" to="/services/search">Find a provider</Link></>}</div>
  return <ul className="chat-list">{items.map((item) => <li key={item.id}>
    <Link className={`chat-list-item${item.id === activeId ? ' is-active' : ''}${item.unread ? ' is-unread' : ''}`} to={`${base}/${item.id}`} aria-current={item.id === activeId ? 'page' : undefined}>
      <span className="chat-avatar" aria-hidden="true">{item.counterpart.photo ? <img src={item.counterpart.photo} alt="" /> : initials(item.counterpart.name)}</span>
      <span className="chat-list-main">
        <span className="chat-list-top"><strong>{item.counterpart.name}</strong>{item.lastMessage && <time dateTime={item.lastMessage.createdAt}>{listTimeLabel(item.lastMessage.createdAt)}</time>}</span>
        <span className="chat-list-preview">{item.lastMessage?.mine && <span className="chat-list-you">You: </span>}{item.lastMessage?.preview === 'Photo' && <Camera size={13} aria-hidden="true" />}{item.lastMessage?.preview ?? 'No messages yet'}</span>
      </span>
      {item.unread > 0 && <span className="chat-unread-count" aria-label={`${item.unread} unread`}>{item.unread > 99 ? '99+' : item.unread}</span>}
    </Link>
  </li>)}</ul>
}
