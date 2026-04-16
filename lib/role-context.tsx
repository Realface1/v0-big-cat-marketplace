'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  userId: string
  email: string
  phone?: string
  name?: string
  city?: string
  state?: string
  location?: string
  latitude?: number
  longitude?: number
  role: 'buyer' | 'merchant' | 'agent'
  merchantProfile?: any
  region?: string
}

interface RoleContextType {
  role: string | null
  user: User | null
  setRole: (role: string | null) => void
  setUser: (user: User | null) => void
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<string | null>(null)
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let isActive = true

    // Read localStorage immediately for a fast first render
    const stored = localStorage.getItem('userRole')
    const storedUser = localStorage.getItem('userData')
    if (stored) setRoleState(stored)
    if (storedUser) {
      try { setUserState(JSON.parse(storedUser)) } catch {}
    }

    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isActive) return

      if (!session) {
        localStorage.removeItem('userRole')
        localStorage.removeItem('userData')
        setRoleState(null)
        setUserState(null)
      }

      setIsLoading(false)
    }

    initializeSession()

    // Sync auth events across tabs and after sign-in/sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setIsLoading(false)
        return
      }

      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem('userRole')
        localStorage.removeItem('userData')
        setRoleState(null)
        setUserState(null)
        setIsLoading(false)
      }
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const setRole = (newRole: string | null) => {
    setRoleState(newRole)
    if (newRole) {
      localStorage.setItem('userRole', newRole)
    } else {
      localStorage.removeItem('userRole')
      // Sign out from Supabase Auth when clearing role
      createClient().auth.signOut()
    }
  }

  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem('userData', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('userData')
    }
  }

  return (
    <RoleContext.Provider value={{ role, user, setRole, setUser, isLoading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within RoleProvider')
  }
  return context
}
