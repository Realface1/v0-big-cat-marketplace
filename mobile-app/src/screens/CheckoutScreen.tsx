import { useState, useMemo } from "react"
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { useAuth } from "../context/auth-context"
import { useCart } from "../context/cart-context"
import { createOrderFromCart, calculateDeliveryFee } from "../lib/api"
import { formatNaira } from "../lib/currency"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type Nav = NativeStackNavigationProp<RootStackParamList>

type DeliveryType = "normal" | "express" | "pickup"
type PaymentMethodType = "palmpay" | "card" | "bank_transfer" | "cash"

const DELIVERY_OPTIONS: { key: DeliveryType; label: string; description: string; icon: string }[] = [
  { key: "normal", label: "Standard Delivery", description: "3-5 business days", icon: "cube-outline" },
  { key: "express", label: "Express Delivery", description: "1-2 business days", icon: "flash-outline" },
  { key: "pickup", label: "Pickup", description: "Collect from merchant", icon: "location-outline" },
]

const PAYMENT_OPTIONS: { key: PaymentMethodType; label: string; icon: string }[] = [
  { key: "palmpay", label: "PalmPay Wallet", icon: "wallet-outline" },
  { key: "card", label: "Debit / Credit Card", icon: "card-outline" },
  { key: "bank_transfer", label: "Bank Transfer", icon: "business-outline" },
  { key: "cash", label: "Cash on Delivery", icon: "cash-outline" },
]

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const { items, getTotal, clearCart } = useCart()

  const savedLocation = [user?.city, user?.state].filter(Boolean).join(", ")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("normal")
  const [deliveryAddress, setDeliveryAddress] = useState(savedLocation)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("palmpay")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const totalWeight = useMemo(() => items.reduce((sum, item) => sum + 0.5 * item.quantity, 0), [items])

  const deliveryFee = useMemo(
    () => calculateDeliveryFee(totalWeight, deliveryType, deliveryAddress),
    [totalWeight, deliveryType, deliveryAddress],
  )

  const subtotal = getTotal()
  const grandTotal = subtotal + deliveryFee

  const handlePlaceOrder = async () => {
    if (!user?.id) return
    if (deliveryType !== "pickup" && !deliveryAddress.trim()) {
      setError("Please enter a delivery address")
      return
    }

    setError("")
    setSubmitting(true)

    try {
      await createOrderFromCart({
        buyerId: user.id,
        items: items.map((item) => ({
          productId: item.productId,
          merchantId: item.merchantId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          weight: 0.5,
        })),
        deliveryType,
        deliveryAddress: deliveryType === "pickup" ? "Pickup" : deliveryAddress.trim(),
        paymentMethod,
        deliveryFee,
      })

      clearCart()
      Alert.alert("Order Placed!", "Your order has been placed successfully.", [
        { text: "View Orders", onPress: () => navigation.navigate("MainTabs") },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={54} color={colors.mutedText} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
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
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Order summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({items.length} item{items.length !== 1 ? "s" : ""})</Text>
          {items.map((item) => (
            <View key={item.productId} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemQty}>×{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>{formatNaira(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Delivery type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
          {DELIVERY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.optionRow, deliveryType === opt.key && styles.optionRowActive]}
              onPress={() => setDeliveryType(opt.key)}
            >
              <Ionicons
                name={opt.icon as any}
                size={20}
                color={deliveryType === opt.key ? colors.primary : colors.mutedText}
                style={styles.optionIcon}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, deliveryType === opt.key && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
              {deliveryType === opt.key && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Delivery address */}
        {deliveryType !== "pickup" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your delivery address"
              placeholderTextColor={colors.mutedText}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.optionRow, paymentMethod === opt.key && styles.optionRowActive]}
              onPress={() => setPaymentMethod(opt.key)}
            >
              <Ionicons
                name={opt.icon as any}
                size={20}
                color={paymentMethod === opt.key ? colors.primary : colors.mutedText}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionLabel, paymentMethod === opt.key && styles.optionLabelActive]}>
                {opt.label}
              </Text>
              {paymentMethod === opt.key && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Price breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>{formatNaira(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery fee</Text>
            <Text style={styles.priceValue}>
              {deliveryType === "pickup" ? "Free" : formatNaira(deliveryFee)}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatNaira(grandTotal)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Place Order · {formatNaira(grandTotal)}</Text>
            </>
          )}
        </Pressable>
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
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
  orderItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  orderItemName: { flex: 1, fontSize: 13, color: colors.text },
  orderItemQty: { fontSize: 13, color: colors.mutedText, marginHorizontal: 8 },
  orderItemPrice: { fontSize: 13, fontWeight: "600", color: colors.text },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: "#f0faf6" },
  optionIcon: { marginRight: 10 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 14, color: colors.text, fontWeight: "500" },
  optionLabelActive: { color: colors.primary },
  optionDesc: { fontSize: 12, color: colors.mutedText, marginTop: 1 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 60,
    textAlignVertical: "top",
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  priceLabel: { fontSize: 14, color: colors.mutedText },
  priceValue: { fontSize: 14, color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 16, fontWeight: "700", color: colors.primary },
  errorText: { color: colors.error, textAlign: "center", marginBottom: 12, fontSize: 13 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 12, fontSize: 16, color: colors.mutedText },
})
