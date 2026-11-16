export type ServiceIconKey =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'aircon'
  | 'appliance'
  | 'phone'
  | 'computer'
  | 'solar'
  | 'cctv'
  | 'network'

export interface ServiceCategory {
  id: number
  slug: string
  name: string
  shortDescription: string
  icon: ServiceIconKey
}

export interface ProviderSummary {
  id: string
  displayName: string
  specialties: string[]
  serviceAreaLabel: string
  rating: number | null
  reviewCount: number
  completedServices: number
  verificationStatus: 'verified' | 'unverified'
  availability: 'available' | 'busy' | 'offline'
  initials: string
  photo?: string | null
  /** Price guide: "From ₱…" per service name, only for services that have one. */
  startingPrices: Record<string, number>
}

export interface ServiceLocationSummary {
  id: number
  label: string
  is_default: boolean
  region: { code: string; name: string }
  province: { code: string; name: string } | null
  city_municipality: { code: string; name: string; type: string }
  barangay: { code: string; name: string }
  address_line: string
  landmark: string | null
  postal_code: string | null
}

export interface ServiceLocationInput {
  label: string
  is_default: boolean
  region_code: string
  province_code: string | null
  city_municipality_code: string
  barangay_code: string
  address_line: string
  landmark: string | null
  postal_code: string | null
}

export interface LocationOption {
  code: string
  name: string
  type?: string
}

export interface AccountProfile {
  id: number
  name: string
  display_name: string | null
  email: string
  email_verified: boolean
  mobile_number: string
}

export interface ServiceSearchFilters {
  query?: string
  categoryId?: number
  locationId?: number
}

export interface CustomerRequest {
  id: number
  description: string
  preferred_at: string
  request_status: string
  created_at: string
  provider_name: string
  service: string
  provider_id: number
  job_id: number | null
  job_status: string | null
  /** When the customer confirmed the finished job (UTC), null until then. */
  completed_at: string | null
  review_id: number | null
  /** The stars this customer gave, when they reviewed the job. */
  review_rating: number | null
  /** The earlier request this one repeats, when the customer booked the same provider again after a finished job. */
  repeat_of: number | null
  /** The agreed visit time (UTC), once the provider has scheduled it. */
  scheduled_at: string | null
  /** An open request to move the visit: who asked, the new time, and their reason. */
  reschedule_by: 'customer' | 'provider' | null
  reschedule_at: string | null
  reschedule_reason: string | null
}

export interface NotificationSummary {
  id: string
  title: string
  description: string
  createdAtLabel: string
  unread: boolean
  href: string
}

export interface CoverLayout {
  fit: 'cover' | 'contain'
  focusX: number
  focusY: number
}

export interface FeaturedService {
  id: string
  providerId: string
  providerName: string
  category: string
  categorySlug: string
  description: string
  cover: CoverLayout & { image: string }
  rating: number | null
  reviewCount: number
  completedServices: number
  verified: boolean
  areaLabel: string
}
