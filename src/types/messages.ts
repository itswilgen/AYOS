export type ChatSide = 'customer' | 'provider'

export interface ChatCounterpart {
  name: string
  photo: string | null
  /** Set on the customer side, so the thread can link back to the provider's profile. */
  providerId: string | null
}

export interface ConversationSummary {
  id: string
  counterpart: ChatCounterpart
  /** False while the provider is suspended or not yet approved. */
  canSend: boolean
  lastMessageAt: string | null
  lastMessage: { preview: string; mine: boolean; createdAt: string } | null
  unread: number
}

export interface ChatMessage {
  id: string
  role: 'customer' | 'provider' | 'system'
  mine: boolean
  body: string | null
  image: string | null
  /** Contact details in this message were replaced before it was stored. */
  masked: boolean
  /** Removed by AYOS after a report. */
  hidden: boolean
  createdAt: string
}

export interface ChatThreadData {
  conversation: Omit<ConversationSummary, 'lastMessage' | 'unread'> & { contactShared: boolean }
  messages: ChatMessage[]
}

export type MessageReportReason = 'harassment' | 'spam' | 'fraud' | 'inappropriate' | 'unsafe' | 'other'

export interface InboxUnread { customer: number; provider: number }

export interface ProviderReview { id: string; rating: number; comment: string | null; service: string; date: string; customerName: string }
export interface ProviderReviewPage { data: ProviderReview[]; hasMore: boolean }
export interface ProviderWorkItem { id: string; title: string; category: string; image: string; date: string }
export type ProviderAchievementKey = 'top_rated' | 'jobs_milestone' | 'repeat_customers' | 'experienced'

export interface PublicProviderProfile {
  id: string
  displayName: string
  bio: string
  yearsExperience: number
  verified: boolean
  photo: string | null
  memberSince: string | null
  acceptingRequests: boolean
  /** True when the signed-in user owns this profile, so they can preview it but not message or book themselves. */
  isOwnProfile: boolean
  rating: number | null
  reviewCount: number
  ratingBreakdown: { stars: number; count: number }[]
  completedServices: number
  repeatCustomers: number
  achievements: { key: ProviderAchievementKey; title: string; detail: string }[]
  areas: string[]
  services: { id: string; category: string; categorySlug: string; description: string; completedJobs: number; cover: { image: string; fit: 'cover' | 'contain'; focusX: number; focusY: number } | null }[]
  portfolio: ProviderWorkItem[]
  reviews: ProviderReviewPage
}
