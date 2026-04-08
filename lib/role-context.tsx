'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface User {
  userId: string
  email: string
  phone?: string
  name?: string
  role: 'buyer' | 'merchant'
  merchantProfile?: any
}

interface RoleContextType {
  role: string | null
  user: User | null
  setRole: (role: string) => void
  setUser: (user: User) => void
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('userRole')
    const storedUser = localStorage.getItem('userData')
    
    if (stored) setRole(stored)
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {}
    }
    
    setIsLoading(false)
  }, [])

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
