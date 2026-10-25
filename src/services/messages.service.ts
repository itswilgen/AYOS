import { apiRequest, backendUrl } from '../lib/api/client'
import type { ChatSide, ChatThreadData, ConversationSummary, InboxUnread, MessageReportReason, ProviderReviewPage, PublicProviderProfile } from '../types/messages'

const base = (side: ChatSide) => side === 'provider' ? '/provider/conversations' : '/conversations'
const media = (path: string | null) => path?.startsWith('/') ? backendUrl(path) : path

const withMedia = (thread: ChatThreadData): ChatThreadData => ({
  conversation: { ...thread.conversation, counterpart: { ...thread.conversation.counterpart, photo: media(thread.conversation.counterpart.photo) } },
  messages: thread.messages.map((message) => ({ ...message, image: media(message.image) })),
})

export const providerProfileService = {
  async getProfile(providerId: string): Promise<PublicProviderProfile | null> {
    const result = await apiRequest<{ data: PublicProviderProfile }>(`/providers/${encodeURIComponent(providerId)}`)
    const profile = result.data
    return {
      ...profile,
      rating: profile.rating === null ? null : Number(profile.rating),
      photo: media(profile.photo),
      services: profile.services.map((service) => ({ ...service, cover: service.cover && { ...service.cover, image: media(service.cover.image) ?? '' } })),
      portfolio: profile.portfolio.map((item) => ({ ...item, image: media(item.image) ?? '' })),
    }
  },
  getReviews(providerId: string, options: { rating?: number | null; before?: string } = {}): Promise<ProviderReviewPage> {
    const query = new URLSearchParams()
    if (options.rating) query.set('rating', String(options.rating))
    if (options.before) query.set('before', options.before)
    return apiRequest<ProviderReviewPage>(`/providers/${encodeURIComponent(providerId)}/reviews${query.size ? `?${query}` : ''}`)
  },
}

export const messagesService = {
  async list(side: ChatSide): Promise<ConversationSummary[]> {
    const result = await apiRequest<{ data: ConversationSummary[] }>(base(side))
    return result.data.map((item) => ({ ...item, counterpart: { ...item.counterpart, photo: media(item.counterpart.photo) } }))
  },
  /** Opens the customer's thread with a provider, reusing it when one exists. Returns the conversation id. */
  async startWithProvider(providerId: string): Promise<string> {
    return (await apiRequest<{ id: string }>('/conversations', { method: 'POST', body: JSON.stringify({ providerId: Number(providerId) }) })).id
  },
  /** Opens the provider's thread with the customer behind a request. Returns the conversation id. */
  async startForRequest(requestId: string): Promise<string> {
    return (await apiRequest<{ id: string }>('/provider/conversations', { method: 'POST', body: JSON.stringify({ requestId: Number(requestId) }) })).id
  },
  /** The latest page of messages, or only those newer than `after` when polling. */
  async thread(side: ChatSide, conversationId: string, after?: string): Promise<ChatThreadData> {
    const query = after ? `?${new URLSearchParams({ after })}` : ''
    return withMedia(await apiRequest<ChatThreadData>(`${base(side)}/${conversationId}/messages${query}`))
  },
  async send(side: ChatSide, conversationId: string, message: { body: string; image: File | null }): Promise<ChatThreadData> {
    const form = new FormData()
    if (message.body.trim()) form.set('body', message.body.trim())
    if (message.image) form.set('image', message.image)
    return withMedia(await apiRequest<ChatThreadData>(`${base(side)}/${conversationId}/messages`, { method: 'POST', body: form }))
  },
  async markRead(side: ChatSide, conversationId: string): Promise<void> {
    await apiRequest(`${base(side)}/${conversationId}/read`, { method: 'POST' })
  },
  async unread(): Promise<InboxUnread> {
    return apiRequest<InboxUnread>('/inbox/unread')
  },
  async report(messageId: string, reason: MessageReportReason, details: string): Promise<void> {
    await apiRequest('/reports', { method: 'POST', body: JSON.stringify({ target_type: 'message', target_id: Number(messageId), reason, details: details.trim() || null }) })
  },
}
