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
  sample: boolean
  photo?: string | null
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

export interface ServiceRequestSummary {
  id: string
  serviceName: string
  status: string
  locationLabel: string
  updatedAtLabel: string
}

export interface NotificationSummary {
  id: string
  title: string
  description: string
  createdAtLabel: string
  unread: boolean
}
