import { useOutletContext } from 'react-router-dom'
import type { ProviderWorkspaceData } from '../../types/provider'

export interface ProviderOutletContext {
  data: ProviderWorkspaceData
  busy: boolean
  error: string
  run: (action: (id: number, name: string) => Promise<ProviderWorkspaceData>, success?: string) => Promise<boolean>
  clearError: () => void
  message: string
}

export function useProviderWorkspace() {
  return useOutletContext<ProviderOutletContext>()
}
