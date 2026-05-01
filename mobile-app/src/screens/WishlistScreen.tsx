import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { useWishlist } from "../context/wishlist-context"
import { useCart } from "../context/cart-context"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type Nav = NativeStackNavigationProp<RootStackParamList>

export function WishlistScreen() {
  const navigation = useNavigation<Nav>()
  const { items, removeItem } = useWishlist()
  const { addItem } = useCart()

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wishlist</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={54} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>Heart items to save them here</Text>
          <Pressable
            style={styles.shopBtn}
            onPress={() => navigation.navigate("MainTabs")}
          >
            <Text style={styles.shopBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Wishlist ({items.length})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => (
          <View key={item.productId} style={styles.card}>
            <View style={styles.imageWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={32} color={colors.mutedText} />
              )}
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              {item.merchantName && (
                <Text style={styles.merchant} numberOfLines={1}>{item.merchantName}</Text>
              )}
              <Text style={styles.price}>{formatNaira(item.price)}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.addBtn}
                onPress={() =>
                  addItem({
                    id: item.productId,
                    productId: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    merchantId: "",
                    merchantName: item.merchantName || "",
                    imageUrl: item.imageUrl,
                  })
                }
              >
                <Ionicons name="cart-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.removeBtn} onPress={() => removeItem(item.productId)}>
                <Ionicons name="heart-dislike-outline" size={16} color={colors.error} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.mutedText, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  shopBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopBtnText: { color: "#fff", fontWeight: "700" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row",
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
  image: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 10, justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "600", color: colors.text },
  merchant: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 4 },
  actions: { flexDirection: "column", padding: 8, gap: 8, justifyContent: "center" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e8f5f0",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
})
