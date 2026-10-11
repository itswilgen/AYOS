import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { apiRequest, authRequest } from '../api/client'
import { AuthContext, type AuthUser } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const current = await apiRequest<AuthUser>('/user')
      setUser(current)
      return current
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const current = await apiRequest<AuthUser>('/user')
        if (active) setUser(current)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const signOut = useCallback(async () => {
    await authRequest<void>('/logout', { method: 'POST', body: '{}' })
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>{children}</AuthContext.Provider>
}
