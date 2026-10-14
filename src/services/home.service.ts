import { apiRequest, backendUrl } from '../lib/api/client'
import type { NotificationSummary, ProviderSummary, ServiceCategory, ServiceIconKey, ServiceSearchFilters } from '../types/marketplace'

type ApiCategory = { id: number; slug: string; name: string; description: string }
type ApiProvider = { id: string; displayName: string; specialties: string[]; serviceAreaLabel: string; rating: number | null; reviewCount: number; completedServices: number; verified: boolean; photo: string | null }

const icon: Record<string, ServiceIconKey> = {
  electrical: 'electrical', plumbing: 'plumbing', carpentry: 'carpentry', aircon: 'aircon',
  'appliance-repair': 'appliance', 'phone-repair': 'phone', 'computer-repair': 'computer',
  solar: 'solar', cctv: 'cctv', 'network-wifi': 'network',
}
const aliases: Record<string, string[]> = {
  electrical: ['electrician', 'wiring'], plumbing: ['plumber', 'leak', 'pipe'], carpentry: ['carpenter', 'woodwork'],
  aircon: ['air conditioning', 'ac cleaning', 'cooling'], 'appliance-repair': ['appliance', 'refrigerator', 'washing machine'],
  'phone-repair': ['phone', 'smartphone'], 'computer-repair': ['computer', 'laptop'], solar: ['solar panel'],
  cctv: ['security camera'], 'network-wifi': ['network', 'wifi', 'wi-fi', 'internet'],
}

export function findServiceCategories(categories: ServiceCategory[], query: string): ServiceCategory[] {
  const term = query.trim().toLowerCase()
  return term ? categories.filter((category) => `${category.name} ${category.shortDescription} ${category.slug}`.toLowerCase().includes(term)
    || aliases[category.slug]?.some((alias) => alias.includes(term) || term.includes(alias))) : []
}

const mapProvider = (provider: ApiProvider): ProviderSummary => ({
  id: provider.id, displayName: provider.displayName, specialties: provider.specialties,
  serviceAreaLabel: provider.serviceAreaLabel, rating: provider.rating === null ? null : Number(provider.rating),
  reviewCount: provider.reviewCount, completedServices: provider.completedServices,
  verificationStatus: provider.verified ? 'verified' : 'unverified', availability: 'available',
  initials: provider.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
  photo: provider.photo ? (provider.photo.startsWith('/') ? backendUrl(provider.photo) : provider.photo) : null,
  sample: false,
})

export const servicesService = {
  async getCategories(): Promise<ServiceCategory[]> {
    const result = await apiRequest<{ data: ApiCategory[] }>('/service-categories')
    return result.data.map((item) => ({ id: item.id, slug: item.slug, name: item.name,
      shortDescription: item.description, icon: icon[item.slug] ?? 'electrical' }))
  },
}

export const providersService = {
  async getProvider(id: string): Promise<ProviderSummary | null> {
    const result = await apiRequest<{ data: ApiProvider[] }>(`/providers?${new URLSearchParams({ providerId: id })}`)
    return result.data[0] ? mapProvider(result.data[0]) : null
  },
  async getFeaturedProviders(): Promise<ProviderSummary[]> {
    const result = await apiRequest<{ data: ApiProvider[] }>('/providers')
    return result.data.map(mapProvider)
  },
  async searchProviders(filters: ServiceSearchFilters & { locationLabel?: string; cityCode?: string }): Promise<ProviderSummary[]> {
    const params = new URLSearchParams()
    const term = filters.query?.trim().toLowerCase()
    if (term) {
      const categories = await servicesService.getCategories()
      const match = categories.find((item) => term.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(term)
        || aliases[item.slug]?.some((alias) => term.includes(alias) || alias.includes(term)))
      if (match) params.set('category', match.slug)
      else params.set('q', term)
    }
    if (filters.cityCode) params.set('cityCode', filters.cityCode)
    const result = await apiRequest<{ data: ApiProvider[] }>(`/providers?${params}`)
    return result.data.map(mapProvider)
  },
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationSummary[]> {
    const result = await apiRequest<{ data: NotificationSummary[] }>('/customer/notifications')
    return result.data.map((item) => ({ ...item, createdAtLabel: new Date(item.createdAtLabel).toLocaleString('en-PH') }))
  },
  async markRead(id: string): Promise<void> { await apiRequest(`/customer/notifications/${id}/read`, { method: 'POST' }) },
}
