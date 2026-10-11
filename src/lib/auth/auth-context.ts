import { createContext } from 'react'

export type AuthUser = {
  id: number
  name: string
  email: string
  mobile_number: string
  email_verified: boolean
  address_complete: boolean
  customer_capability: true
  mfa_enabled: boolean
}

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refreshUser: () => Promise<AuthUser | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
