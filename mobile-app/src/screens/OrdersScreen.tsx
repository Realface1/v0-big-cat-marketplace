import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native"

import { useAuth } from "../context/auth-context"
import { fetchBuyerOrders, type BuyerOrder } from "../lib/api"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"

function OrderStatusBadge({ status }: { status?: string | null }) {
  const normalized = String(status || "pending").toLowerCase()
  const isDone = normalized === "delivered"
  const isWarn = normalized === "pending" || normalized === "processing"

  return (
    <View
      style={[
        styles.statusBadge,
        isDone ? styles.statusDone : isWarn ? styles.statusWarn : styles.statusInfo,
      ]}
    >
      <Text style={styles.statusText}>{normalized}</Text>
    </View>
  )
}

export function OrdersScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<BuyerOrder[]>([])

  const load = useCallback(async () => {
    if (!user?.id) return

    setError("")
    try {
      const data = await fetchBuyerOrders(user.id)
      setOrders(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders")
    }
  }, [user?.id])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await load()
      setLoading(false)
    }

    init()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>Your Orders</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Your placed orders will appear here.</Text>
          </View>
        ) : null}

        {orders.map((order) => {
          const orderItems = Array.isArray(order.order_items) ? order.order_items : []
          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.orderId}>Order #{String(order.id).slice(0, 8)}</Text>
                <OrderStatusBadge status={order.status} />
              </View>

              <Text style={styles.orderTotal}>{formatNaira(Number(order.grand_total || order.total_amount || 0))}</Text>

              <Text style={styles.metaText}>Items: {orderItems.length}</Text>
              <Text style={styles.metaText}>Address: {order.delivery_address || order.shipping_address || "N/A"}</Text>

              <View style={styles.itemsWrap}>
                {orderItems.slice(0, 3).map((item, idx) => (
                  <Text key={`${order.id}-${idx}`} style={styles.itemLine} numberOfLines={1}>
                    {item.product_name || item.products?.name || "Product"} x{item.quantity}
                  </Text>
                ))}
                {orderItems.length > 3 ? <Text style={styles.moreItems}>+{orderItems.length - 3} more items</Text> : null}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.mutedText,
    fontSize: 13,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderId: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  orderTotal: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  metaText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  itemsWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 4,
  },
  itemLine: {
    color: colors.text,
    fontSize: 12,
  },
  moreItems: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDone: {
    backgroundColor: "#d9f5ea",
  },
  statusWarn: {
    backgroundColor: "#fef3c7",
  },
  statusInfo: {
    backgroundColor: colors.secondary,
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
})
