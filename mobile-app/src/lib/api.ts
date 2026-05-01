const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || ""

let apiAccessToken: string | null = null

export function setApiAccessToken(token: string | null) {
  apiAccessToken = token
}

export type MarketplaceProduct = {
  id: string
  name: string
  description?: string | null
  price: number
  stock?: number | null
  average_rating?: number | null
  review_count?: number | null
  images?: string[] | null
  merchant_id?: string | null
  image_url?: string | null
  category?: string | null
  merchant_profiles?: {
    id?: string | null
    name?: string | null
    business_name?: string | null
    location?: string | null
    distance_km?: number | null
  } | null
}

type ProductsResponse = {
  success?: boolean
  error?: string
  data?: MarketplaceProduct[]
}

type ProductResponse = {
  success?: boolean
  error?: string
  data?: MarketplaceProduct | null
}

export type AuthUser = {
  id: string
  email?: string | null
  name?: string | null
  role?: "buyer" | "merchant" | string
  phone?: string | null
  city?: string | null
  state?: string | null
}

type LoginResponse = {
  success?: boolean
  error?: string
  data?: {
    user?: AuthUser
    session?: {
      access_token?: string
    }
  }
}

type SignupResponse = {
  success?: boolean
  error?: string
}

export type BuyerOrderItem = {
  id?: string
  product_id?: string
  product_name?: string
  quantity?: number
  unit_price?: number
  price?: number
  products?: {
    name?: string
  } | null
}

export type BuyerOrder = {
  id: string
  status?: string | null
  grand_total?: number | null
  total_amount?: number | null
  delivery_address?: string | null
  shipping_address?: string | null
  order_items?: BuyerOrderItem[]
}

type OrdersResponse = {
  success?: boolean
  error?: string
  data?: BuyerOrder[]
}

type CreateOrderResponse = {
  success?: boolean
  error?: string
  data?: any
}

export type UserProfile = {
  id: string
  email?: string | null
  name?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
}

type ProfileResponse = {
  success?: boolean
  error?: string
  data?: UserProfile
}

function normalizeBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL. Add it to mobile-app/.env.")
  }

  return API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
}

async function apiRequest(path: string, options?: RequestInit) {
  const base = normalizeBaseUrl()
  const url = `${base}${path}`

  const headers = new Headers(options?.headers || {})
  if (!headers.has("content-type") && options?.body) {
    headers.set("content-type", "application/json")
  }

  if (apiAccessToken) {
    headers.set("authorization", `Bearer ${apiAccessToken}`)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

export async function loginWithPassword(email: string, password: string) {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json()) as LoginResponse

  if (!response.ok || !body.success || !body.data?.user || !body.data?.session?.access_token) {
    throw new Error(body.error || "Login failed")
  }

  return {
    user: {
      ...body.data.user,
      id: String(body.data.user.id),
    },
    accessToken: body.data.session.access_token,
  }
}

export async function signUpAccount(payload: {
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
}) {
  const response = await apiRequest("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as SignupResponse
  if (!response.ok || !body.success) {
    throw new Error(body.error || "Sign up failed")
  }
}

export async function fetchMarketplaceProducts(options?: {
  search?: string
  buyerLat?: number | null
  buyerLng?: number | null
}): Promise<MarketplaceProduct[]> {
  const search = options?.search || ""
  const base = normalizeBaseUrl()
  const url = new URL(`${base}/api/products`)

  if (search.trim()) {
    url.searchParams.set("search", search.trim())
  }

  if (Number.isFinite(Number(options?.buyerLat)) && Number.isFinite(Number(options?.buyerLng))) {
    url.searchParams.set("buyerLat", String(options?.buyerLat))
    url.searchParams.set("buyerLng", String(options?.buyerLng))
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Products request failed: ${response.status}`)
  }

  const body = (await response.json()) as ProductsResponse
  if (!body.success) {
    throw new Error(body.error || "Products API returned an error")
  }

  return Array.isArray(body.data)
    ? body.data.map((item) => ({
        ...item,
        id: String(item.id),
        price: Number(item.price || 0),
      }))
    : []
}

export async function fetchMarketplaceProductById(productId: string): Promise<MarketplaceProduct> {
  const response = await apiRequest(`/api/products/${encodeURIComponent(productId)}`)

  if (!response.ok) {
    throw new Error(`Product request failed: ${response.status}`)
  }

  const body = (await response.json()) as ProductResponse

  if (!body.success || !body.data) {
    throw new Error(body.error || "Product API returned an error")
  }

  return {
    ...body.data,
    id: String(body.data.id),
    price: Number(body.data.price || 0),
  }
}

export async function fetchBuyerOrders(userId: string): Promise<BuyerOrder[]> {
  const response = await apiRequest(`/api/orders/buyer?buyerId=${encodeURIComponent(userId)}`)
  const body = (await response.json()) as OrdersResponse

  if (!response.ok || !body.success) {
    throw new Error(body.error || "Unable to load buyer orders")
  }

  return Array.isArray(body.data)
    ? body.data.map((order) => ({
        ...order,
        id: String(order.id),
        grand_total: Number(order.grand_total || 0),
        total_amount: Number(order.total_amount || 0),
      }))
    : []
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await apiRequest(`/api/user/profile?userId=${encodeURIComponent(userId)}`)
  const body = (await response.json()) as ProfileResponse

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || "Unable to load user profile")
  }

  return {
    ...body.data,
    id: String(body.data.id),
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string
    phone?: string
    city?: string
    state?: string
  },
): Promise<UserProfile> {
  const response = await apiRequest("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify({ userId, updates }),
  })

  const body = (await response.json()) as ProfileResponse
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || "Unable to update user profile")
  }

  return {
    ...body.data,
    id: String(body.data.id),
  }
}

export async function createOrderFromCart(payload: {
  buyerId: string
  items: Array<{
    productId: string
    merchantId: string
    productName?: string
    quantity: number
    unitPrice: number
    weight?: number
  }>
  deliveryType: "normal" | "express" | "pickup"
  deliveryAddress: string
  paymentMethod?: string
  deliveryFee?: number
}) {
  const response = await apiRequest("/api/orders/create", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as CreateOrderResponse
  if (!response.ok || !body.success) {
    throw new Error(body.error || "Failed to create order")
  }

  return body
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type AppNotification = {
  id: string
  title?: string | null
  message?: string | null
  type?: string | null
  read?: boolean | null
  created_at?: string | null
}

type NotificationsResponse = {
  success?: boolean
  error?: string
  data?: AppNotification[]
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const response = await apiRequest("/api/notifications")
  const body = (await response.json()) as NotificationsResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load notifications")
  return Array.isArray(body.data) ? body.data : []
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiRequest("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ notificationId }),
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ markAll: true }),
  })
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export type Review = {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string
  created_at: string
  user_name?: string | null
}

type ReviewsResponse = {
  success?: boolean
  error?: string
  data?: Review[]
  averageRating?: number
  totalReviews?: number
}

export async function fetchProductReviews(productId: string): Promise<{ reviews: Review[]; averageRating: number; totalReviews: number }> {
  const response = await apiRequest(`/api/products/${encodeURIComponent(productId)}/reviews`)
  const body = (await response.json()) as ReviewsResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load reviews")
  return {
    reviews: Array.isArray(body.data) ? body.data : [],
    averageRating: Number(body.averageRating || 0),
    totalReviews: Number(body.totalReviews || 0),
  }
}

export async function submitReview(productId: string, userId: string, rating: number, comment: string): Promise<void> {
  const response = await apiRequest(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: "POST",
    body: JSON.stringify({ userId, rating, comment }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to submit review")
}

export async function checkCanReview(productId: string, userId: string): Promise<{ canReview: boolean; hasReviewed: boolean }> {
  const response = await apiRequest(`/api/products/${encodeURIComponent(productId)}/reviews/can-review?userId=${encodeURIComponent(userId)}`)
  if (!response.ok) return { canReview: false, hasReviewed: false }
  const body = await response.json()
  return { canReview: Boolean(body.canReview), hasReviewed: Boolean(body.hasReviewed) }
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type Conversation = {
  id: string
  buyer_id?: string | null
  merchant_id?: string | null
  product_id?: string | null
  last_message_at?: string | null
  other_name?: string | null
  last_message?: string | null
  unread_count?: number | null
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read?: boolean | null
}

type ConversationsResponse = { success?: boolean; error?: string; data?: Conversation[] }
type MessagesResponse = { success?: boolean; error?: string; data?: Message[] }

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const response = await apiRequest(`/api/messages/conversation?userId=${encodeURIComponent(userId)}`)
  const body = (await response.json()) as ConversationsResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load conversations")
  return Array.isArray(body.data) ? body.data : []
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const response = await apiRequest(`/api/messages/${encodeURIComponent(conversationId)}`)
  const body = (await response.json()) as MessagesResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load messages")
  return Array.isArray(body.data) ? body.data : []
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<void> {
  const response = await apiRequest("/api/messages/send", {
    method: "POST",
    body: JSON.stringify({ conversationId, senderId, content }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to send message")
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export type PaymentMethod = {
  id: string
  type?: string | null
  last4?: string | null
  label?: string | null
  is_default?: boolean | null
}

type PaymentMethodsResponse = { success?: boolean; error?: string; data?: PaymentMethod[] }

export async function fetchPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const response = await apiRequest(`/api/user/payment-methods?userId=${encodeURIComponent(userId)}`)
  const body = (await response.json()) as PaymentMethodsResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load payment methods")
  return Array.isArray(body.data) ? body.data : []
}

export async function addPaymentMethod(userId: string, method: { type: string; label: string }): Promise<void> {
  const response = await apiRequest("/api/user/payment-methods", {
    method: "POST",
    body: JSON.stringify({ userId, method }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to add payment method")
}

export async function deletePaymentMethod(userId: string, methodId: string): Promise<void> {
  const response = await apiRequest(`/api/user/payment-methods?userId=${encodeURIComponent(userId)}&methodId=${encodeURIComponent(methodId)}`, {
    method: "DELETE",
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to remove payment method")
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const response = await apiRequest("/api/user/settings", {
    method: "POST",
    body: JSON.stringify({ userId, action: "change-password", currentPassword, newPassword }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to change password")
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: { email_notifications?: boolean; push_notifications?: boolean; sms_notifications?: boolean },
): Promise<void> {
  const response = await apiRequest("/api/user/settings", {
    method: "POST",
    body: JSON.stringify({ userId, action: "update-notifications", ...prefs }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to update notification preferences")
}

// ─── Merchant Products ────────────────────────────────────────────────────────

export type MerchantProduct = {
  id: string
  name: string
  price: number
  stock?: number | null
  category?: string | null
  description?: string | null
  images?: string[] | null
  status?: string | null
}

type MerchantProductsResponse = { success?: boolean; error?: string; data?: MerchantProduct[] }

export async function fetchMerchantProducts(merchantId: string): Promise<MerchantProduct[]> {
  const response = await apiRequest(`/api/merchant/products?merchantId=${encodeURIComponent(merchantId)}`)
  const body = (await response.json()) as MerchantProductsResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load merchant products")
  return Array.isArray(body.data) ? body.data : []
}

export async function fetchMerchantOrders(merchantId: string): Promise<BuyerOrder[]> {
  const response = await apiRequest(`/api/orders/merchant?merchantId=${encodeURIComponent(merchantId)}`)
  const body = (await response.json()) as OrdersResponse
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to load merchant orders")
  return Array.isArray(body.data) ? body.data.map((o) => ({ ...o, id: String(o.id) })) : []
}

export async function updateOrderStatus(orderId: string, merchantId: string, status: string): Promise<void> {
  const response = await apiRequest("/api/orders/update-status", {
    method: "POST",
    body: JSON.stringify({ orderId, merchantId, status }),
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.error || "Failed to update order status")
}

// ─── Delivery fee (client-side calc) ─────────────────────────────────────────

export function calculateDeliveryFee(weight: number, deliveryType: "normal" | "express" | "pickup", location: string): number {
  if (deliveryType === "pickup") return 0
  const baseFee = deliveryType === "express" ? 2500 : 1000
  const weightFee = Math.ceil(weight) * (deliveryType === "express" ? 300 : 150)
  const lower = location.toLowerCase()
  let locationFee = 1200
  if (lower.includes("lagos") || lower.includes("abuja")) locationFee = 500
  else if (lower.includes("port harcourt") || lower.includes("ibadan")) locationFee = 800
  return baseFee + weightFee + locationFee
}
