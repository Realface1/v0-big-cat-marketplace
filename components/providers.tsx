"use client"

import { RoleProvider } from "@/lib/role-context"
import { CartProvider } from "@/lib/cart-context"
import { WishlistProvider } from "@/lib/wishlist-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <WishlistProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </WishlistProvider>
    </RoleProvider>
  )
}
