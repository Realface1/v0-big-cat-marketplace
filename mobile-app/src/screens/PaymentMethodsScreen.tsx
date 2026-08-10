import { useState, useEffect, useCallback } from "react"
import {
  ActivityIndicator,
  Alert,
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

import { useAuth } from "../context/auth-context"
import { fetchPaymentMethods, addPaymentMethod, deletePaymentMethod, type PaymentMethod } from "../lib/api"
import { colors } from "../theme"

const METHOD_TYPE_OPTIONS = ["card", "bank_transfer", "palmpay"]
const TYPE_LABELS: Record<string, string> = {
  card: "Debit/Credit Card",
  bank_transfer: "Bank Transfer",
  palmpay: "PalmPay Wallet",
}

export function PaymentMethodsScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newType, setNewType] = useState("card")
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchPaymentMethods(user.id)
      setMethods(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      setError("Label is required")
      return
    }
    setAdding(true)
    setError("")
    try {
      await addPaymentMethod(user!.id, { type: newType, label: newLabel.trim() })
      setNewLabel("")
      setShowAddForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add payment method")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = (method: PaymentMethod) => {
    Alert.alert("Remove Payment Method", `Remove "${method.label || method.type}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePaymentMethod(user!.id, method.id)
            load()
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove")
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <Pressable onPress={() => setShowAddForm(!showAddForm)} style={styles.addBtn}>
          <Ionicons name={showAddForm ? "close" : "add"} size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.sectionTitle}>Add Payment Method</Text>

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {METHOD_TYPE_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, newType === t && styles.typeChipActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.typeChipText, newType === t && styles.typeChipTextActive]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Label (e.g. "My GTBank Card")</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a label for this method"
              placeholderTextColor={colors.mutedText}
              value={newLabel}
              onChangeText={setNewLabel}
            />

            <Pressable
              style={[styles.saveBtn, adding && styles.saveBtnDisabled]}
              onPress={handleAdd}
              disabled={adding}
            >
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Add Method</Text>}
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : methods.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="card-outline" size={48} color={colors.mutedText} />
            <Text style={styles.emptyText}>No payment methods added yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add a payment method</Text>
          </View>
        ) : (
          methods.map((method) => (
            <View key={method.id} style={styles.methodCard}>
              <Ionicons
                name={method.type === "card" ? "card-outline" : method.type === "palmpay" ? "wallet-outline" : "business-outline"}
                size={24}
                color={colors.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{method.label || TYPE_LABELS[method.type || ""] || method.type}</Text>
                {method.last4 && <Text style={styles.methodSub}>•••• {method.last4}</Text>}
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => handleDelete(method)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  addBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  errorText: { color: colors.error, fontSize: 13, marginBottom: 12 },
  addForm: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  label: { fontSize: 13, color: colors.mutedText, marginBottom: 4 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 12, color: colors.mutedText },
  typeChipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 15, color: colors.mutedText, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  methodSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  defaultBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  defaultBadgeText: { fontSize: 11, color: colors.success, fontWeight: "600" },
  deleteBtn: { padding: 8 },
})
