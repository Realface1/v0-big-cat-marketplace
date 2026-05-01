import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

const CART_STORAGE_KEY = "bigcat.cart.v1"

export type CartItem = {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  merchantId: string
  merchantName: string
  imageUrl?: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
  getTotal: () => number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const initialized = useRef(false)

  // Restore cart from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as CartItem[]
            if (Array.isArray(saved)) setItems(saved)
          } catch {}
        }
      })
      .finally(() => {
        initialized.current = true
      })
  }, [])

  // Persist cart to storage whenever it changes (after init)
  useEffect(() => {
    if (!initialized.current) return
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => {})
  }, [items])

  const addItem = useCallback((item: CartItem) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId)
      if (!existing) {
        return [...current, item]
      }

      return current.map((entry) =>
        entry.productId === item.productId
          ? { ...entry, quantity: entry.quantity + Math.max(1, item.quantity) }
          : entry,
      )
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId)
        return
      }

      setItems((current) =>
        current.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
      )
    },
    [removeItem],
  )

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [items])

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemCount,
      getTotal,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, getItemCount, getTotal],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }

  return context
}
