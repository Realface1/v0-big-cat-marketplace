import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { loginWithPassword, setApiAccessToken, signUpAccount, type AuthUser } from "../lib/api"

const STORAGE_KEY = "bigcat.mobile.auth"

type AuthContextType = {
  loading: boolean
  user: AuthUser | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (payload: {
    email: string
    password: string
    name: string
    phone: string
    city: string
    state: string
    role: "buyer" | "merchant"
    smedanId?: string
    cacId?: string
    merchantType?: "products" | "services"
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!raw) return

        const parsed = JSON.parse(raw) as { user?: AuthUser; accessToken?: string }
        const nextUser = parsed?.user || null
        const nextToken = parsed?.accessToken || null

        if (nextUser && nextToken) {
          setUser(nextUser)
          setAccessToken(nextToken)
          setApiAccessToken(nextToken)
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const saveSession = useCallback(async (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser)
    setAccessToken(nextToken)
    setApiAccessToken(nextToken)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, accessToken: nextToken }))
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginWithPassword(email, password)
        await saveSession(result.user, result.accessToken)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        }
      }
    },
    [saveSession],
  )

  const signup = useCallback(
    async (payload: {
      email: string
      password: string
      name: string
      phone: string
      city: string
      state: string
      role: "buyer" | "merchant"
      smedanId?: string
      cacId?: string
      merchantType?: "products" | "services"
    }) => {
      try {
        await signUpAccount(payload)
        const loginResult = await loginWithPassword(payload.email, payload.password)
        await saveSession(loginResult.user, loginResult.accessToken)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Sign up failed",
        }
      }
    },
    [saveSession],
  )

  const logout = useCallback(async () => {
    setUser(null)
    setAccessToken(null)
    setApiAccessToken(null)
    await AsyncStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      loading,
      user,
      accessToken,
      login,
      signup,
      logout,
    }),
    [loading, user, accessToken, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
