import type { CoverLayout } from './marketplace'
export type RequestStatus = 'new' | 'accepted' | 'declined'
export type JobStatus = 'accepted' | 'scheduled' | 'in_progress' | 'provider_finished' | 'completed' | 'cancelled'

export interface ProviderRequest {
  id: string
  service: string
  customerName: string
  approximateLocation: string
  preferredAt: string
  description: string
  notes: string
  photos: string[]
  createdAt: string
  status: RequestStatus
}

export interface ProviderJob {
  id: string
  requestId: string
  service: string
  customerName: string
  approximateLocation: string
  scheduledAt: string | null
  address: string | null
  status: JobStatus
}

export type CoverReviewStatus = 'pending' | 'approved' | 'rejected'
export interface ServiceCover extends CoverLayout { image: string; status: CoverReviewStatus; note: string | null }
export interface ProviderService { id: string; category: string; description: string; active: boolean; cover: ServiceCover | null }
export interface ProviderServiceArea { id: string; region: string; province: string; city: string; barangay?: string; active: boolean }
export interface ProviderReview { id: string; rating: number; comment: string; service: string; date: string; customerName: string }
export interface PortfolioItem { id: string; title: string; category: string; image: string }
export interface ProviderProfile {
  displayName: string
  bio: string
  yearsExperience: number
  photo: string | null
  verified: boolean
  portfolio: PortfolioItem[]
}
export interface ProviderAccess {
  kind: 'trial' | 'lifetime'
  successfulClients: number
  limit: number
  activationFee: number | null
  paymentStatus?: 'pending' | 'confirmed' | 'rejected' | null
  paymentReference?: string | null
  activationPaymentsEnabled?: boolean
  activationPaymentInstructions?: string
}
export interface ProviderNotification { id: string; title: string; detail: string; createdAt: string; read: boolean; href: string }
export interface ProviderWorkspaceData {
  approved: boolean
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected'
  acceptingRequests: boolean
  requests: ProviderRequest[]
  jobs: ProviderJob[]
  services: ProviderService[]
  areas: ProviderServiceArea[]
  reviews: ProviderReview[]
  profile: ProviderProfile
  access: ProviderAccess
  notifications: ProviderNotification[]
}
