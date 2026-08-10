import type { MarketplaceProduct } from "../lib/api"

export type RootStackParamList = {
  Auth: undefined
  MainTabs: undefined
  ProductDetails: {
    productId: string
    product?: MarketplaceProduct
  }
  Checkout: undefined
  PaymentMethods: undefined
  Settings: undefined
  Notifications: undefined
  Messages: undefined
  MessageThread: { conversationId: string; recipientName: string }
  MerchantProducts: undefined
  MerchantOrders: undefined
  WishlistScreen: undefined
}

export type MainTabsParamList = {
  Marketplace: undefined
  Orders: undefined
  Cart: undefined
  Profile: undefined
  MerchantDashboard: undefined
}
