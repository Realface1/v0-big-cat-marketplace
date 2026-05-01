import { useMemo } from "react"
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { useCart } from "../context/cart-context"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type Nav = NativeStackNavigationProp<RootStackParamList>

export function CartScreen() {
  const navigation = useNavigation<Nav>()
  const { items, clearCart, getTotal, updateQuantity, removeItem } = useCart()

  const grouped = useMemo(() => {
    return items.reduce<Record<string, { name: string; items: typeof items }>>((acc, item) => {
      if (!acc[item.merchantId]) {
        acc[item.merchantId] = { name: item.merchantName, items: [] }
      }
      acc[item.merchantId].items.push(item)
      return acc
    }, {})
  }, [items])

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={54} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Start shopping to add items to your cart</Text>
        </View>
      </SafeAreaView>
    )
  }

  const total = getTotal()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Shopping Cart</Text>

        <View style={styles.groupsWrap}>
          {Object.entries(grouped).map(([merchantId, payload]) => (
            <View key={merchantId} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{payload.name}</Text>
              </View>

              {payload.items.map((item) => (
                <View key={item.productId} style={styles.itemRow}>
                  <View style={styles.thumb} />

                  <View style={styles.itemMain}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>{formatNaira(item.price)}</Text>

                    <View style={styles.qtyControls}>
                      <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Ionicons name="remove" size={14} color={colors.mutedText} />
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Ionicons name="add" size={14} color={colors.mutedText} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.itemSide}>
                    <Pressable style={styles.deleteButton} onPress={() => removeItem(item.productId)}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>{formatNaira(item.price * item.quantity)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footerWrap}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatNaira(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>Calculated at checkout</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatNaira(total)}</Text>
          </View>

          <Pressable style={styles.checkoutButton} onPress={() => navigation.navigate("Checkout")}>
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </Pressable>
          <Pressable style={styles.clearButton} onPress={clearCart}>
            <Text style={styles.clearButtonText}>Clear Cart</Text>
          </Pressable>
        </View>
      </View>
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
    paddingTop: 14,
    paddingBottom: 220,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 14,
  },
  groupsWrap: {
    gap: 14,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  groupHeader: {
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  itemMain: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  itemPrice: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    width: 20,
    textAlign: "center",
  },
  itemSide: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  deleteButton: {
    padding: 4,
  },
  subtotalLabel: {
    color: colors.mutedText,
    fontSize: 11,
  },
  subtotalValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  checkoutButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingVertical: 12,
  },
  checkoutButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "700",
  },
  checkoutMessage: {
    color: colors.mutedText,
    fontSize: 12,
  },
  clearButton: {
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: "center",
    paddingVertical: 10,
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: "center",
  },
})
