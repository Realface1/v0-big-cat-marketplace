"use client"

import { RoleProvider } from "@/lib/role-context"
import { CartProvider } from "@/lib/cart-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </RoleProvider>
  )
}
