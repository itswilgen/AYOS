import { apiRequest } from '../lib/api/client'

export interface AdminPageResult<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export interface AdminAccess { access: 'allowed'; permissions: string[] }
export interface AdminPasswordChange { password: string; password_confirmation: string }
export interface AdminRoleOption { slug: string; name: string }
export interface NewAdministrator extends AdminPasswordChange { name: string; email: string; mobile_number: string; role: string }
export interface CreatedAdministrator { id: number; name: string; email: string; role: string }
export interface AdminDashboard {
  totalUsers: number
  approvedProviders: number
  pendingApplications: number
  activeRequests: number
  completedJobs: number
  openDisputes: number
  quotaReachedProviders: number
  lifetimeActivations: number
  pendingPayments: number
  recentActivity: { id: number; event: string; created_at: string; actor: string | null }[]
}

const encode = (value: unknown) => JSON.stringify(value)
const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) })
  const text = params.toString()
  return text ? `?${text}` : ''
}

export const adminService = {
  access: () => apiRequest<AdminAccess>('/admin/access-check'),
  dashboard: () => apiRequest<{ data: AdminDashboard }>('/admin/dashboard'),
  list: <T,>(path: string, values: Record<string, string | number | undefined> = {}) => apiRequest<AdminPageResult<T>>(`${path}${query(values)}`),
  get: <T,>(path: string) => apiRequest<{ data: T }>(path),
  send: <T,>(path: string, method: string, payload?: unknown) => apiRequest<T>(path, { method, ...(payload === undefined ? {} : { body: encode(payload) }) }),
  /** The signed-in administrator's own password. The admin form doesn't ask for the current one. */
  changePassword: (payload: AdminPasswordChange) => apiRequest<{ message: string }>('/admin/account/password', { method: 'PUT', body: encode(payload) }),
  /** Super admins and administrators only. The creator chooses the first password and shares it privately. */
  createAdministrator: (payload: NewAdministrator) => apiRequest<{ data: CreatedAdministrator }>('/admin/administrators', { method: 'POST', body: encode(payload) }),
}
