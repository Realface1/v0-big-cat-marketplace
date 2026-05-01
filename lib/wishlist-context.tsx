"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRole } from "@/lib/role-context"

export interface WishlistItem {
  id: string
  productId: string
  name: string
  price: number
  category: string
  image?: string | null
  merchant: {
    id: string
    business_name: string
    logo_url?: string
    location?: string
  }
}

interface WishlistContextType {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  toggleItem: (item: WishlistItem) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
  getItemCount: () => number
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

function getStorageKey(userId?: string) {
  return `bigcat_wishlist_${userId || "guest"}`
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useRole()
  const storageKey = useMemo(() => getStorageKey(user?.userId), [user?.userId])
  const [items, setItems] = useState<WishlistItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setItems(Array.isArray(parsed) ? parsed : [])

      if (user?.userId) {
        const guestKey = getStorageKey()
        const guestRaw = localStorage.getItem(guestKey)
        const guestParsed = guestRaw ? JSON.parse(guestRaw) : []

        if (Array.isArray(guestParsed) && guestParsed.length > 0) {
          setItems((current) => {
            const merged = [...current]
            guestParsed.forEach((item) => {
              if (!merged.some((entry) => entry.productId === item.productId)) {
                merged.push(item)
              }
            })
            return merged
          })
          localStorage.removeItem(guestKey)
        }
      }
    } catch {
      setItems([])
    } finally {
      setHydrated(true)
    }
  }, [storageKey, user?.userId])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items, storageKey, hydrated])

  const addItem = useCallback((item: WishlistItem) => {
    setItems((prevItems) => {
      if (prevItems.some((entry) => entry.productId === item.productId)) {
        return prevItems
      }
      return [...prevItems, item]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((entry) => entry.productId !== productId))
  }, [])

  const toggleItem = useCallback((item: WishlistItem) => {
    setItems((prevItems) => {
      if (prevItems.some((entry) => entry.productId === item.productId)) {
        return prevItems.filter((entry) => entry.productId !== item.productId)
      }
      return [...prevItems, item]
    })
  }, [])

  const isInWishlist = useCallback(
    (productId: string) => items.some((entry) => entry.productId === productId),
    [items]
  )

  const clearWishlist = useCallback(() => {
    setItems([])
  }, [])

  const getItemCount = useCallback(() => items.length, [items])

  return (
    <WishlistContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        toggleItem,
        isInWishlist,
        clearWishlist,
        getItemCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)

  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider")
  }

  return context
}
