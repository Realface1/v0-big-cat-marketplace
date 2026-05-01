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
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { useAuth } from "../context/auth-context"
import { fetchMerchantProducts, type MerchantProduct } from "../lib/api"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#dcfce7", text: "#166534" },
  inactive: { bg: "#f3f4f6", text: "#6b7280" },
  out_of_stock: { bg: "#fee2e2", text: "#991b1b" },
}

export function MerchantProductsScreen() {
  const { user } = useAuth()
  const [products, setProducts] = useState<MerchantProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchMerchantProducts(user.id)
      setProducts(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products</Text>
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
      ) : products.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="cube-outline" size={48} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No products listed yet</Text>
          <Text style={styles.emptySubtext}>Add products via the web merchant dashboard</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          contentContainerStyle={styles.content}
        >
          {products.map((product) => {
            const statusKey = product.status || "active"
            const statusStyle = STATUS_COLORS[statusKey] || STATUS_COLORS["active"]
            const imageUrl = product.images?.[0]

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.imageWrap}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={28} color={colors.mutedText} />
                  )}
                </View>

                <View style={styles.productBody}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  {product.category && (
                    <Text style={styles.productCategory}>{product.category}</Text>
                  )}
                  <View style={styles.productMeta}>
                    <Text style={styles.productPrice}>{formatNaira(product.price)}</Text>
                    <Text style={styles.stockText}>
                      {product.stock != null ? `${product.stock} in stock` : "Stock N/A"}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {statusKey.replace("_", " ")}
                  </Text>
                </View>
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
  emptySubtext: { fontSize: 13, color: colors.mutedText, marginTop: 4, textAlign: "center" },
  content: { padding: 16, paddingBottom: 40 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    width: 80,
    height: 80,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: { width: 80, height: 80 },
  productBody: { flex: 1, padding: 10, justifyContent: "center" },
  productName: { fontSize: 13, fontWeight: "600", color: colors.text },
  productCategory: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
  productMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  productPrice: { fontSize: 13, fontWeight: "700", color: colors.primary },
  stockText: { fontSize: 11, color: colors.mutedText },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    alignSelf: "center",
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
})
