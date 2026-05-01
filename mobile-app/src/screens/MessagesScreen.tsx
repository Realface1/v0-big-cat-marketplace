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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { useAuth } from "../context/auth-context"
import { fetchConversations, type Conversation } from "../lib/api"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type Nav = NativeStackNavigationProp<RootStackParamList>

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function MessagesScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchConversations(user.id)
      setConversations(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
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
      ) : conversations.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="chatbubbles-outline" size={54} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation from a product page</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {conversations.map((convo) => (
            <Pressable
              key={convo.id}
              style={styles.convoCard}
              onPress={() =>
                navigation.navigate("MessageThread", {
                  conversationId: convo.id,
                  recipientName: convo.other_name || "Merchant",
                })
              }
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.convoTopRow}>
                  <Text style={styles.convoName}>{convo.other_name || "Merchant"}</Text>
                  <Text style={styles.convoTime}>{timeAgo(convo.last_message_at)}</Text>
                </View>
                {convo.last_message && (
                  <Text style={styles.convoPreview} numberOfLines={1}>{convo.last_message}</Text>
                )}
              </View>
              {(convo.unread_count ?? 0) > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{convo.unread_count}</Text>
                </View>
              )}
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
  convoCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  convoTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  convoName: { fontSize: 14, fontWeight: "600", color: colors.text },
  convoTime: { fontSize: 11, color: colors.mutedText },
  convoPreview: { fontSize: 13, color: colors.mutedText },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
})
