import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"

const WISHLIST_KEY = "bigcat.wishlist.v1"

export type WishlistItem = {
  productId: string
  name: string
  price: number
  imageUrl?: string | null
  merchantName?: string | null
  category?: string | null
}

type WishlistContextType = {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  toggleItem: (item: WishlistItem) => void
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as WishlistItem[]
            if (Array.isArray(saved)) setItems(saved)
          } catch {}
        }
      })
      .finally(() => {
        initialized.current = true
      })
  }, [])

  useEffect(() => {
    if (!initialized.current) return
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items)).catch(() => {})
  }, [items])

  const addItem = useCallback((item: WishlistItem) => {
    setItems((current) =>
      current.find((i) => i.productId === item.productId) ? current : [...current, item],
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((i) => i.productId !== productId))
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  )

  const toggleItem = useCallback(
    (item: WishlistItem) => {
      if (items.find((i) => i.productId === item.productId)) {
        removeItem(item.productId)
      } else {
        addItem(item)
      }
    },
    [items, addItem, removeItem],
  )

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isWishlisted, toggleItem }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider")
  return ctx
}
