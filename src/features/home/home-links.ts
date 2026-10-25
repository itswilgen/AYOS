import type { ServiceLocationSummary } from '../../types/marketplace'

export const locationLabel = (location: ServiceLocationSummary) =>
  `${location.city_municipality.name}, ${location.province?.name ?? location.region.name}`

/** Search URL for a service, scoped to the customer's saved location when they have one. */
export function serviceSearchPath(service: string, location?: ServiceLocationSummary) {
  const params = new URLSearchParams({ service })
  if (location) {
    params.set('location', locationLabel(location))
    params.set('locationId', String(location.id))
  }
  return `/services/search?${params}`
}
