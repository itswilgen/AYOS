import { apiRequest, backendUrl } from '../lib/api/client'
import type { PortfolioItem, ProviderProfile, ProviderService, ProviderServiceArea, ProviderWorkspaceData } from '../types/provider'

const json = (value: unknown) => JSON.stringify(value)
const change = (path: string, method: string, body?: unknown) => apiRequest<ProviderWorkspaceData>(path, { method, ...(body === undefined ? {} : { body: json(body) }) })
const upload = (path: string, form: FormData) => apiRequest<ProviderWorkspaceData>(path, { method: 'POST', body: form })

function absolutePhotos(data: ProviderWorkspaceData): ProviderWorkspaceData {
  const absolute = (path: string) => path.startsWith('/') ? backendUrl(path) : path
  return { ...data, requests: data.requests.map((request) => ({ ...request, photos: request.photos.map(absolute) })),
    profile: { ...data.profile, photo: data.profile.photo ? absolute(data.profile.photo) : null,
      portfolio: data.profile.portfolio.map((item) => ({ ...item, image: absolute(item.image) })) } }
}

const workspace = () => apiRequest<ProviderWorkspaceData>('/provider/workspace').then(absolutePhotos)
const updated = async (promise: Promise<ProviderWorkspaceData>) => absolutePhotos(await promise)

export const providerWorkspaceService = {
  getAreaOptions: () => apiRequest<{ region: string; province: string; cities: string[] }[]>('/provider/area-options'),
  getAreaBarangays: (region: string, province: string, city: string) => apiRequest<string[]>(`/provider/area-barangays?${new URLSearchParams({ region, province, city })}`),
  getWorkspace: (id: number, name: string) => { void id; void name; return workspace() },
  apply: (profile: Pick<ProviderProfile, 'displayName' | 'bio' | 'yearsExperience'>) => change('/provider/apply', 'POST', profile),
  applyWithDocuments: (profile: Pick<ProviderProfile, 'displayName' | 'bio' | 'yearsExperience'>, documents: File[]) => {
    const form = new FormData()
    form.set('displayName', profile.displayName)
    form.set('bio', profile.bio)
    form.set('yearsExperience', String(profile.yearsExperience))
    documents.forEach(file => form.append('verificationDocuments[]', file))
    return upload('/provider/apply', form)
  },
  submitActivationPayment: (reference: string) => change('/provider/activation-payments', 'POST', { reference }),
  setAcceptingRequests: (_id: number, _name: string, accepting: boolean) => updated(change('/provider/accepting', 'PATCH', { accepting })),
  acceptRequest: (_id: number, _name: string, requestId: string) => updated(change(`/provider/requests/${requestId}/accept`, 'POST')),
  declineRequest: (_id: number, _name: string, requestId: string) => updated(change(`/provider/requests/${requestId}/decline`, 'POST')),
  scheduleJob: (_id: number, _name: string, jobId: string, scheduledAt: string) => updated(change(`/provider/jobs/${jobId}/schedule`, 'POST', { scheduledAt })),
  startJob: (_id: number, _name: string, jobId: string) => updated(change(`/provider/jobs/${jobId}/start`, 'POST')),
  finishJob: (_id: number, _name: string, jobId: string) => updated(change(`/provider/jobs/${jobId}/finish`, 'POST')),
  saveService: (_id: number, _name: string, service: Pick<ProviderService, 'category' | 'description'> & { id?: string }) => updated(change(service.id ? `/provider/services/${service.id}` : '/provider/services', service.id ? 'PUT' : 'POST', { category: service.category, description: service.description })),
  toggleService: (_id: number, _name: string, serviceId: string) => updated(change(`/provider/services/${serviceId}/toggle`, 'POST')),
  addArea: (_id: number, _name: string, area: Pick<ProviderServiceArea, 'region' | 'province' | 'city' | 'barangay'>) => updated(change('/provider/areas', 'POST', area)),
  removeArea: (_id: number, _name: string, areaId: string) => updated(change(`/provider/areas/${areaId}`, 'DELETE')),
  saveProfile: (_id: number, _name: string, profile: Pick<ProviderProfile, 'displayName' | 'bio' | 'yearsExperience'>) => updated(change('/provider/profile', 'PATCH', profile)),
  setProfilePhoto: (id: number, name: string, photo: File) => { void id; void name; const form = new FormData(); form.set('photo', photo); return updated(upload('/provider/profile/photo', form)) },
  addPortfolioItem: (id: number, name: string, item: Omit<PortfolioItem, 'id' | 'image'> & { image: File }) => { void id; void name; const form = new FormData(); form.set('title', item.title); form.set('category', item.category); form.set('image', item.image); return updated(upload('/provider/portfolio', form)) },
  removePortfolioItem: (_id: number, _name: string, itemId: string) => updated(change(`/provider/portfolio/${itemId}`, 'DELETE')),
  markNotificationRead: (_id: number, _name: string, noteId: string) => updated(change(`/provider/notifications/${noteId}/read`, 'POST')),
  markAllNotificationsRead: (id: number, name: string) => { void id; void name; return updated(change('/provider/notifications/read-all', 'POST')) },
}
