import { sampleNotifications, sampleProviders, sampleRequests, serviceCategories } from '../mocks/marketplace.mock'
import type {
  NotificationSummary,
  ProviderSummary,
  ServiceCategory,
  ServiceRequestSummary,
  ServiceSearchFilters,
} from '../types/marketplace'

const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 90))
const categoryAliases: Record<string, string[]> = {
  electrical: ['electrician', 'electric', 'wiring'],
  plumbing: ['plumber', 'pipe', 'leak'],
  carpentry: ['carpenter', 'woodwork'],
  aircon: ['air con', 'air conditioning', 'ac cleaning', 'cooling'],
  'appliance-repair': ['appliance', 'refrigerator', 'washing machine'],
  'phone-repair': ['phone', 'smartphone', 'mobile repair'],
  'computer-repair': ['computer', 'laptop', 'pc repair'],
  solar: ['solar installer', 'solar panel'],
  cctv: ['camera installation', 'security camera'],
  'network-wifi': ['network', 'wifi', 'wi-fi', 'internet'],
}

export function findServiceCategories(categories: ServiceCategory[], query: string): ServiceCategory[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []
  return categories.filter((category) =>
    `${category.name} ${category.shortDescription} ${category.slug}`.toLocaleLowerCase().includes(normalized)
    || categoryAliases[category.slug]?.some((alias) => alias.includes(normalized) || normalized.includes(alias)),
  )
}

export const servicesService = {
  async getCategories(): Promise<ServiceCategory[]> {
    await pause()
    return serviceCategories
  },
}

export const providersService = {
  async getFeaturedProviders(): Promise<ProviderSummary[]> {
    await pause()
    return sampleProviders.filter((provider) => provider.availability !== 'offline')
  },

  async searchProviders(filters: ServiceSearchFilters & { locationLabel?: string }): Promise<ProviderSummary[]> {
    await pause()
    const query = filters.query?.trim().toLocaleLowerCase()
    if (!query) return []
    if (!filters.locationLabel || !filters.locationLabel.toLocaleLowerCase().includes('tanjay')) return []
    const matchedCategory = serviceCategories.find((category) =>
      `${category.name} ${category.slug}`.toLocaleLowerCase().includes(query)
      || categoryAliases[category.slug]?.some((alias) => alias.includes(query) || query.includes(alias)),
    )
    const categoryName = matchedCategory?.name.toLocaleLowerCase()
    return sampleProviders.filter((provider) => provider.specialties.some((specialty) =>
      specialty.toLocaleLowerCase().includes(query)
      || Boolean(categoryName && specialty.toLocaleLowerCase().includes(categoryName)),
    ) || provider.displayName.toLocaleLowerCase().includes(query))
  },
}

export const requestsService = {
  async getActiveRequests(): Promise<ServiceRequestSummary[]> {
    await pause()
    return sampleRequests
  },
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationSummary[]> {
    await pause()
    return sampleNotifications
  },
}
