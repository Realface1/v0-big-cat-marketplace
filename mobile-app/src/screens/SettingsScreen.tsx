import { useState, useEffect } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

import { useAuth } from "../context/auth-context"
import { changePassword, updateNotificationPrefs, fetchUserProfile } from "../lib/api"
import { colors } from "../theme"

type Tab = "password" | "notifications"

export function SettingsScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("password")

  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetchUserProfile(user.id).then((profile) => {
      if ((profile as any).email_notifications != null) setEmailNotif(Boolean((profile as any).email_notifications))
      if ((profile as any).push_notifications != null) setPushNotif(Boolean((profile as any).push_notifications))
      if ((profile as any).sms_notifications != null) setSmsNotif(Boolean((profile as any).sms_notifications))
    }).catch(() => {})
  }, [user?.id])

  const handlePasswordChange = async () => {
    setMessage(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "All fields are required" })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" })
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(user!.id, currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage({ type: "success", text: "Password changed successfully" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to change password" })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveNotifications = async () => {
    setMessage(null)
    setSavingNotif(true)
    try {
      await updateNotificationPrefs(user!.id, {
        email_notifications: emailNotif,
        push_notifications: pushNotif,
        sms_notifications: smsNotif,
      })
      setMessage({ type: "success", text: "Notification preferences saved" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save preferences" })
    } finally {
      setSavingNotif(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["password", "notifications"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => { setActiveTab(tab); setMessage(null) }}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === "password" ? "Password" : "Notifications"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {message && (
          <View style={[styles.banner, message.type === "error" ? styles.bannerError : styles.bannerSuccess]}>
            <Ionicons
              name={message.type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
              size={16}
              color={message.type === "error" ? colors.error : colors.success}
            />
            <Text style={[styles.bannerText, { color: message.type === "error" ? colors.error : colors.success }]}>
              {message.text}
            </Text>
          </View>
        )}

        {activeTab === "password" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>

            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor={colors.mutedText}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedText} />
              </Pressable>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showNew}
                placeholder="Enter new password (min 8 chars)"
                placeholderTextColor={colors.mutedText}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedText} />
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={colors.mutedText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Pressable
              style={[styles.saveBtn, savingPassword && styles.saveBtnDisabled]}
              onPress={handlePasswordChange}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Change Password</Text>
              )}
            </Pressable>
          </View>
        )}

        {activeTab === "notifications" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notification Preferences</Text>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Email Notifications</Text>
                <Text style={styles.switchDesc}>Order updates, promotions</Text>
              </View>
              <Switch
                value={emailNotif}
                onValueChange={setEmailNotif}
                trackColor={{ true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Push Notifications</Text>
                <Text style={styles.switchDesc}>Real-time order alerts</Text>
              </View>
              <Switch
                value={pushNotif}
                onValueChange={setPushNotif}
                trackColor={{ true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>SMS Notifications</Text>
                <Text style={styles.switchDesc}>Text message alerts</Text>
              </View>
              <Switch
                value={smsNotif}
                onValueChange={setSmsNotif}
                trackColor={{ true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <Pressable
              style={[styles.saveBtn, savingNotif && styles.saveBtnDisabled]}
              onPress={handleSaveNotifications}
              disabled={savingNotif}
            >
              {savingNotif ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              )}
            </Pressable>
          </View>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontSize: 14, color: colors.mutedText },
  tabLabelActive: { color: colors.primary, fontWeight: "600" },
  content: { padding: 16 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  bannerError: { backgroundColor: "#fef2f2" },
  bannerSuccess: { backgroundColor: "#f0fdf4" },
  bannerText: { fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, color: colors.mutedText, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  eyeBtn: { position: "absolute", right: 10, padding: 4 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: "500" },
  switchDesc: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
