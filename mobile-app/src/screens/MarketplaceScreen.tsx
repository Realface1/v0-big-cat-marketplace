import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

import { formatNaira } from "../lib/currency"
import { fetchMarketplaceProducts, type MarketplaceProduct } from "../lib/api"
import { useCart } from "../context/cart-context"
import { BrandWordmark } from "../components/BrandWordmark"
import { colors } from "../theme"

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Food & Drinks",
  "Health & Beauty",
  "Home & Living",
  "Agriculture",
  "Sports",
  "Baby & Kids",
  "Automotive",
  "Books & Media",
  "Other",
]

export function MarketplaceScreen() {
  const navigation = useNavigation<any>()
  const { getItemCount, addItem } = useCart()
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [maxPrice, setMaxPrice] = useState("")
  const [distanceLimit, setDistanceLimit] = useState("")
  const [sortBy, setSortBy] = useState<"relevance" | "nearest" | "priceAsc" | "priceDesc">("relevance")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<MarketplaceProduct[]>([])

  const cartCount = getItemCount()

  const visibleProducts = useMemo(() => {
    let filtered = [...products]

    if (selectedCategory) {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    const localQuery = query.trim().toLowerCase().replace(/\s+/g, "")
    if (localQuery) {
      filtered = filtered.filter((product) => {
        const fields = [
          product.name,
          product.description || "",
          product.merchant_profiles?.business_name || "",
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase().replace(/\s+/g, ""))

        return fields.some((field) => field.includes(localQuery))
      })
    }

    if (maxPrice && Number.isFinite(Number(maxPrice))) {
      const cap = Number(maxPrice)
      filtered = filtered.filter((product) => Number(product.price || 0) <= cap)
    }

    if (distanceLimit && Number.isFinite(Number(distanceLimit))) {
      const limit = Number(distanceLimit)
      filtered = filtered.filter((product) => {
        const distance = Number(product?.merchant_profiles?.distance_km)
        return Number.isFinite(distance) && distance <= limit
      })
    }

    if (sortBy === "nearest") {
      filtered.sort(
        (a, b) => Number(a?.merchant_profiles?.distance_km || 99999) - Number(b?.merchant_profiles?.distance_km || 99999),
      )
    }

    if (sortBy === "priceAsc") {
      filtered.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))
    }

    if (sortBy === "priceDesc") {
      filtered.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0))
    }

    return filtered
  }, [products, selectedCategory, query, maxPrice, distanceLimit, sortBy])

  const loadProducts = useCallback(async () => {
    setError(null)
    try {
      const nextProducts = await fetchMarketplaceProducts()
      setProducts(nextProducts)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load products"
      setError(message)
    }
  }, [])

  useEffect(() => {
    async function initLoad() {
      setLoading(true)
      await loadProducts()
      setLoading(false)
    }

    initLoad()
  }, [loadProducts])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProducts()
    setRefreshing(false)
  }, [loadProducts])

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceProduct }) => (
      <Pressable
        style={styles.card}
        onPress={() =>
          navigation.navigate("ProductDetails", {
            productId: item.id,
            product: item,
          })
        }
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>No image</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatNaira(item.price)}</Text>
          <Text style={styles.metaText}>{item.category || "General"}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.merchantText}>{item.merchant_profiles?.business_name || "Merchant"}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                addItem({
                  id: item.id,
                  productId: item.id,
                  name: item.name,
                  price: Number(item.price || 0),
                  quantity: 1,
                  merchantId: String(item.merchant_id || item.merchant_profiles?.id || "merchant"),
                  merchantName: item.merchant_profiles?.business_name || "Merchant",
                  imageUrl: item.image_url,
                })
              }
            >
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    ),
    [navigation],
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <BrandWordmark compact />
        <Pressable style={styles.cartChip} onPress={() => navigation.navigate("Cart")}>
          <Ionicons name="cart-outline" size={16} color={colors.text} />
          <Text style={styles.cartChipText}>{cartCount}</Text>
        </Pressable>
      </View>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={colors.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search products or SME/Merchants..."
            placeholderTextColor={colors.mutedText}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <Pressable style={[styles.filterButton, showFilters ? styles.filterButtonActive : null]} onPress={() => setShowFilters((v) => !v)}>
          <Ionicons name="options-outline" size={16} color={showFilters ? colors.primaryText : colors.text} />
          <Text style={[styles.filterButtonText, showFilters ? styles.filterButtonTextActive : null]}>Filters</Text>
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterHeading}>Filter by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Pressable
              style={[styles.filterChip, !selectedCategory ? styles.filterChipActive : null]}
              onPress={() => setSelectedCategory("")}
            >
              <Text style={[styles.filterChipText, !selectedCategory ? styles.filterChipTextActive : null]}>All Categories</Text>
            </Pressable>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.filterChip, selectedCategory === category ? styles.filterChipActive : null]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.filterChipText, selectedCategory === category ? styles.filterChipTextActive : null]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.filterInputsRow}>
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="numeric"
              placeholder="Max price (NGN)"
              placeholderTextColor={colors.mutedText}
              style={styles.filterInput}
            />
            <TextInput
              value={distanceLimit}
              onChangeText={setDistanceLimit}
              keyboardType="numeric"
              placeholder="Max distance (km)"
              placeholderTextColor={colors.mutedText}
              style={styles.filterInput}
            />
          </View>

          <View style={styles.sortRow}>
            {[
              { label: "Relevance", value: "relevance" },
              { label: "Nearest", value: "nearest" },
              { label: "Price Low", value: "priceAsc" },
              { label: "Price High", value: "priceDesc" },
            ].map((entry) => (
              <Pressable
                key={entry.value}
                style={[styles.sortChip, sortBy === entry.value ? styles.sortChipActive : null]}
                onPress={() => setSortBy(entry.value as "relevance" | "nearest" | "priceAsc" | "priceDesc")}
              >
                <Text style={[styles.sortChipText, sortBy === entry.value ? styles.sortChipTextActive : null]}>{entry.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term or pull to refresh</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  cartChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 12,
    fontSize: 15,
  },
  filterButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: colors.primaryText,
  },
  filterPanel: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  chipsRow: {
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#d9f5ea",
  },
  filterChipText: {
    color: colors.text,
    fontSize: 12,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  filterInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#d9f5ea",
  },
  sortChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
  sortChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  productImage: {
    width: "100%",
    height: 170,
    backgroundColor: "#dbeafe",
  },
  imageFallback: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  imageFallbackText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  productName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  productPrice: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  metaText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  merchantText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  rowBetween: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "700",
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
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
})
