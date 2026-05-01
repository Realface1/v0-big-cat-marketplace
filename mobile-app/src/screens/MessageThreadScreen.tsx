import { useState, useEffect, useRef, useCallback } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"

import { useAuth } from "../context/auth-context"
import { fetchMessages, sendMessage, type Message } from "../lib/api"
import { colors } from "../theme"
import type { RootStackParamList } from "../navigation/types"

type RouteType = RouteProp<RootStackParamList, "MessageThread">

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function MessageThreadScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteType>()
  const { conversationId, recipientName } = route.params
  const { user } = useAuth()
  const scrollRef = useRef<ScrollView>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId)
      setMessages(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => { load() }, [load])

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || !user?.id) return

    setText("")
    setSending(true)
    try {
      await sendMessage(conversationId, user.id, content)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send")
      setText(content) // restore on failure
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{recipientName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id
              return (
                <View key={msg.id} style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : {}]}>
                      {formatTime(msg.created_at)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.mutedText}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  messagesContent: { padding: 16, paddingBottom: 8 },
  errorText: { color: colors.error, textAlign: "center", marginBottom: 8 },
  msgRow: { marginBottom: 8, maxWidth: "80%" },
  msgRowMine: { alignSelf: "flex-end" },
  msgRowTheirs: { alignSelf: "flex-start" },
  bubble: { borderRadius: 16, padding: 10, paddingHorizontal: 14 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: colors.text },
  bubbleTime: { fontSize: 10, color: colors.mutedText, marginTop: 3, textAlign: "right" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
})
