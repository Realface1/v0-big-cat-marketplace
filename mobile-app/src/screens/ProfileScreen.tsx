import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { useAuth } from "../context/auth-context"
import { fetchUserProfile, updateUserProfile, type UserProfile } from "../lib/api"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type Nav = NativeStackNavigationProp<RootStackParamList>

type NavLink = { icon: string; label: string; screen: keyof RootStackParamList }

const BUYER_NAV_LINKS: NavLink[] = [
  { icon: "heart-outline", label: "Wishlist", screen: "WishlistScreen" },
  { icon: "chatbubbles-outline", label: "Messages", screen: "Messages" },
  { icon: "notifications-outline", label: "Notifications", screen: "Notifications" },
  { icon: "card-outline", label: "Payment Methods", screen: "PaymentMethods" },
  { icon: "settings-outline", label: "Settings", screen: "Settings" },
]

const MERCHANT_NAV_LINKS: NavLink[] = [
  { icon: "cube-outline", label: "My Products", screen: "MerchantProducts" },
  { icon: "receipt-outline", label: "Merchant Orders", screen: "MerchantOrders" },
  { icon: "chatbubbles-outline", label: "Messages", screen: "Messages" },
  { icon: "notifications-outline", label: "Notifications", screen: "Notifications" },
  { icon: "settings-outline", label: "Settings", screen: "Settings" },
]

export function ProfileScreen() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<Nav>()
  const isMerchant = user?.role === "merchant"
  const navLinks = isMerchant ? MERCHANT_NAV_LINKS : BUYER_NAV_LINKS
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [stateText, setStateText] = useState("")

  const load = useCallback(async () => {
    if (!user?.id) return
    setError("")
    try {
      const data = await fetchUserProfile(user.id)
      setProfile(data)
      setName(String(data.name || ""))
      setPhone(String(data.phone || ""))
      setCity(String(data.city || ""))
      setStateText(String(data.state || ""))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load profile")
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

  const onSave = async () => {
    if (!user?.id) return

    setSuccess("")
    setError("")
    setSaving(true)

    try {
      const updated = await updateUserProfile(user.id, {
        name,
        phone,
        city,
        state: stateText,
      })
      setProfile(updated)
      setSuccess("Profile updated")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.staticValue}>{profile?.email || user?.email || "N/A"}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Name" placeholderTextColor={colors.mutedText} />

          <Text style={styles.label}>Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone" placeholderTextColor={colors.mutedText} keyboardType="phone-pad" />

          <View style={styles.doubleRow}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>State</Text>
              <TextInput value={stateText} onChangeText={setStateText} style={styles.input} placeholder="State" placeholderTextColor={colors.mutedText} />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>City</Text>
              <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" placeholderTextColor={colors.mutedText} />
            </View>
          </View>

          <Pressable style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]} onPress={onSave} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Profile"}</Text>
          </Pressable>
        </View>

        {/* Quick navigation links */}
        <View style={styles.card}>
          {navLinks.map((link, idx) => (
            <Pressable
              key={link.screen}
              style={[styles.navLink, idx < navLinks.length - 1 && styles.navLinkBorder]}
              onPress={() => navigation.navigate(link.screen as any)}
            >
              <Ionicons name={link.icon as any} size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.navLinkText}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Log Out</Text>
        </Pressable>
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  label: {
    color: colors.mutedText,
    fontSize: 12,
  },
  staticValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  doubleRow: {
    flexDirection: "row",
    gap: 8,
  },
  rowItem: {
    flex: 1,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },
  navLinkBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLinkText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
})
