import { apiRequest } from '../lib/api/client'
import type { AccountProfile } from '../types/marketplace'

type Resource<T> = { data: T }

export const profileService = {
  async getProfile(): Promise<AccountProfile> {
    const result = await apiRequest<Resource<AccountProfile>>('/me/profile')
    return result.data
  },
  async updateProfile(input: Pick<AccountProfile, 'name' | 'display_name'>): Promise<AccountProfile> {
    const result = await apiRequest<Resource<AccountProfile>>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return result.data
  },
}
