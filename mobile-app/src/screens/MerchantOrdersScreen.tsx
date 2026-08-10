import { useState, useEffect, useCallback } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

import { useAuth } from "../context/auth-context"
import { fetchMerchantOrders, updateOrderStatus, type BuyerOrder } from "../lib/api"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef9c3", text: "#854d0e" },
  confirmed: { bg: "#dbeafe", text: "#1e40af" },
  processing: { bg: "#e0e7ff", text: "#3730a3" },
  shipped: { bg: "#dcfce7", text: "#166534" },
  delivered: { bg: "#d1fae5", text: "#065f46" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
}

export function MerchantOrdersScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchMerchantOrders(user.id)
      setOrders(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, user!.id, status)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Merchant Orders</Text>
        <Pressable onPress={() => load(true)}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="receipt-outline" size={48} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Orders from buyers will appear here</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {orders.map((order) => {
            const statusStyle = STATUS_COLORS[order.status || "pending"] || STATUS_COLORS["pending"]
            const isExpanded = expandedId === order.id

            return (
              <View key={order.id} style={styles.orderCard}>
                <Pressable style={styles.orderHeader} onPress={() => setExpandedId(isExpanded ? null : order.id)}>
                  <View>
                    <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.orderTotal}>
                      {formatNaira(Number(order.grand_total || order.total_amount || 0))}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {order.status || "pending"}
                      </Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedText} />
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.orderExpanded}>
                    {order.delivery_address && (
                      <Text style={styles.addressText}>
                        <Text style={styles.addressLabel}>Ship to: </Text>
                        {order.delivery_address}
                      </Text>
                    )}

                    {(order.order_items || []).map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.product_name || item.products?.name || "Item"}
                        </Text>
                        <Text style={styles.itemQty}>×{item.quantity}</Text>
                        <Text style={styles.itemPrice}>
                          {formatNaira(Number(item.unit_price || item.price || 0) * Number(item.quantity || 1))}
                        </Text>
                      </View>
                    ))}

                    <Text style={styles.statusLabel}>Update Status</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      <View style={styles.statusButtons}>
                        {STATUS_OPTIONS.map((s) => (
                          <Pressable
                            key={s}
                            style={[
                              styles.statusBtn,
                              order.status === s && styles.statusBtnActive,
                            ]}
                            onPress={() => handleStatusChange(order.id, s)}
                            disabled={updatingId === order.id || order.status === s}
                          >
                            {updatingId === order.id ? (
                              <ActivityIndicator size="small" color={order.status === s ? "#fff" : colors.primary} />
                            ) : (
                              <Text style={[styles.statusBtnText, order.status === s && styles.statusBtnTextActive]}>
                                {s}
                              </Text>
                            )}
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: colors.error, textAlign: "center" },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.mutedText, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  orderCard: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  orderId: { fontSize: 13, fontWeight: "700", color: colors.text },
  orderTotal: { fontSize: 15, fontWeight: "700", color: colors.primary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  orderExpanded: { paddingHorizontal: 16, paddingBottom: 16 },
  addressText: { fontSize: 12, color: colors.mutedText, marginBottom: 10 },
  addressLabel: { fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, color: colors.text },
  itemQty: { fontSize: 13, color: colors.mutedText, marginHorizontal: 8 },
  itemPrice: { fontSize: 13, fontWeight: "600", color: colors.text },
  statusLabel: { fontSize: 12, color: colors.mutedText, marginTop: 12 },
  statusButtons: { flexDirection: "row", gap: 6 },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: "center",
  },
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusBtnText: { fontSize: 11, color: colors.text, textTransform: "capitalize" },
  statusBtnTextActive: { color: "#fff" },
})
