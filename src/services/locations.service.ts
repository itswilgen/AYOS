import { apiRequest } from '../lib/api/client'
import type { LocationOption, ServiceLocationInput, ServiceLocationSummary } from '../types/marketplace'

type Resource<T> = { data: T }

export const locationsService = {
  async getSavedLocations(): Promise<ServiceLocationSummary[]> {
    const result = await apiRequest<Resource<ServiceLocationSummary[]>>('/me/service-locations')
    return result.data
  },

  async createLocation(input: ServiceLocationInput): Promise<ServiceLocationSummary> {
    const result = await apiRequest<Resource<ServiceLocationSummary>>('/me/service-locations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return result.data
  },

  async updateLocation(id: number, input: ServiceLocationInput): Promise<ServiceLocationSummary> {
    const result = await apiRequest<Resource<ServiceLocationSummary>>(`/me/service-locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return result.data
  },

  async setDefaultLocation(id: number): Promise<ServiceLocationSummary> {
    const result = await apiRequest<Resource<ServiceLocationSummary>>(`/me/service-locations/${id}/default`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return result.data
  },

  async deleteLocation(id: number): Promise<void> {
    await apiRequest<void>(`/me/service-locations/${id}`, { method: 'DELETE' })
  },

  async getRegions(): Promise<LocationOption[]> {
    const result = await apiRequest<Resource<LocationOption[]>>('/locations/regions')
    return result.data
  },

  async getProvinces(regionCode: string): Promise<LocationOption[]> {
    const result = await apiRequest<Resource<LocationOption[]>>(`/locations/regions/${encodeURIComponent(regionCode)}/provinces`)
    return result.data
  },

  async getCities(provinceCode: string): Promise<LocationOption[]> {
    const result = await apiRequest<Resource<LocationOption[]>>(`/locations/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`)
    return result.data
  },

  async getCitiesInRegion(regionCode: string): Promise<LocationOption[]> {
    const result = await apiRequest<Resource<LocationOption[]>>(`/locations/regions/${encodeURIComponent(regionCode)}/cities-municipalities`)
    return result.data
  },

  async getBarangays(cityCode: string): Promise<LocationOption[]> {
    const result = await apiRequest<Resource<LocationOption[]>>(`/locations/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`)
    return result.data
  },
}
