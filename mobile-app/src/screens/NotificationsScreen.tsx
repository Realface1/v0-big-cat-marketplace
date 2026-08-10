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

import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification } from "../lib/api"
import { colors } from "../theme"

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_ICON: Record<string, string> = {
  order: "receipt-outline",
  system: "information-circle-outline",
  alert: "warning-outline",
  report: "flag-outline",
}

export function NotificationsScreen() {
  const navigation = useNavigation()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {}
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="notifications-off-outline" size={54} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll see order updates and alerts here</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {notifications.map((notif) => (
            <Pressable
              key={notif.id}
              style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
              onPress={() => !notif.read && handleMarkRead(notif.id)}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(TYPE_ICON[notif.type || ""] || "notifications-outline") as any}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                {notif.title && <Text style={styles.notifTitle}>{notif.title}</Text>}
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
              </View>
              {!notif.read && <View style={styles.unreadDot} />}
            </Pressable>
          ))}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  markAllBtn: { padding: 6 },
  markAllText: { fontSize: 13, color: colors.primary },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: colors.error, marginTop: 8, textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyTitle: { fontSize: 16, color: colors.mutedText, fontWeight: "600", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.mutedText, marginTop: 4, textAlign: "center" },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  notifCardUnread: { backgroundColor: "#f0faf6" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f5f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 },
  notifMessage: { fontSize: 13, color: colors.mutedText, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
})
