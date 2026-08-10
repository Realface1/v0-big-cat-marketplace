"use client"

import { useEffect, useState } from "react"
import { useRole } from "@/lib/role-context"
import {
  containsBlockedContactRequest,
  getUserStrikeCount,
  isUserSuspended,
  resetSafetyState,
  syncSafetyStateFromServer,
} from "@/lib/trust-safety"
import {
  ArrowLeft,
  Send,
  Mic,
  Phone,
  MoreVertical,
  Store,
  ShoppingCart,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  ShieldAlert,
  FileText,
  Plus,
  X,
} from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"

interface Message {
  id: string
  sender: "buyer" | "merchant"
  text: string
  timestamp: Date
  read: boolean
}

export interface Conversation {
  id: string
  vendorId: string | number
  vendorName: string
  vendorLocation: string
  vendorRating: number
  lastMessage: string
  timestamp: Date
  unread: number
  avatar: string
}

function mapConversation(conversation: any, userId?: string): Conversation {
  const counterpart = conversation?.buyer_id === userId
    ? conversation?.merchant || conversation?.buyer
    : conversation?.buyer || conversation?.merchant
  const displayName = counterpart?.business_name || counterpart?.full_name || counterpart?.name || "Vendor"

  return {
    id: conversation.id,
    vendorId: counterpart?.id || conversation.merchant_id,
    vendorName: displayName,
    vendorLocation: counterpart?.location || "Nigeria",
    vendorRating: 4.8,
    lastMessage: conversation.last_message || "Start a conversation",
    timestamp: new Date(conversation.last_message_at || conversation.created_at || Date.now()),
    unread: Number(conversation?.unread_count || 0),
    avatar: displayName.charAt(0).toUpperCase(),
  }
}

function mapMessage(message: any, userId?: string): Message {
  return {
    id: message.id,
    sender: message.sender_id === userId ? "buyer" : "merchant",
    text: message.content,
    timestamp: new Date(message.created_at || Date.now()),
    read: Boolean(message.read_at),
  }
}

function ChatListScreen({
  conversations,
  loading,
  onSelectConversation,
  onRefresh,
}: {
  conversations: Conversation[]
  loading: boolean
  onSelectConversation: (conv: Conversation) => void
  onRefresh: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Message options"
          >
            <MoreVertical className="w-5 h-5 text-foreground" />
          </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => {
                    onRefresh()
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  Refresh messages
                </button>
                <button
                  onClick={() => {
                    alert("For your safety, use in-app chat for all buyer and merchant conversations.")
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  Safety tips
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground">
              Tap <strong>Chat Service Provider</strong> on any SME/Merchant page to start messaging.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-primary shadow-sm">
                  {conv.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{conv.vendorName}</h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTime(conv.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <span className="ml-auto flex-shrink-0 flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-secondary/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 For your safety, keep all communication within the platform
        </p>
      </div>
    </div>
  )
}

function ChatConversationScreen({
  conversation,
  onBack,
  onViewStore,
  onPlaceOrder,
  userRole,
  merchantId,
}: {
  conversation: Conversation
  onBack: () => void
  onViewStore?: (conversation: Conversation) => void
  onPlaceOrder?: (conversation: Conversation) => void
  userRole?: 'merchant' | 'buyer'
  merchantId?: string
}) {
  const { user } = useRole()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [showBillForm, setShowBillForm] = useState(false)
  const [billForm, setBillForm] = useState({
    scopeSummary: '',
    timeline: '',
    lineItems: [{ description: '', quantity: 1, unit_price: 0 }] as { description: string; quantity: number; unit_price: number }[],
    discountAmount: '',
    notes: '',
    validUntil: '',
  })
  const [sendingBill, setSendingBill] = useState(false)
  const [billError, setBillError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [suspended, setSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)

  const syncFromServerStatus = async () => {
    if (!user?.userId) return

    try {
      const response = await fetch(`/api/safety/status?userId=${encodeURIComponent(user.userId)}`)
      const result = await response.json()
      if (result.success) {
        const nextStrikes = Number(result.strikes || 0)
        const nextSuspended = Boolean(result.suspended)
        const nextRemainingMs = Number(result.remainingMs || 0)

        syncSafetyStateFromServer(user.userId, {
          strikes: nextStrikes,
          suspended: nextSuspended,
          remainingMs: nextRemainingMs,
        })

        setStrikeCount(nextStrikes)
        setSuspended(nextSuspended)
        return
      }
    } catch (error) {
      console.error("Failed to fetch safety status:", error)
    }

    // Fallback to local safety state when status endpoint is unavailable.
    const userId = user.userId
    setSuspended(isUserSuspended(userId))
    setStrikeCount(getUserStrikeCount(userId))
  }

  const handleVoiceInput = () => {
    if (typeof window === "undefined") return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setWarning("Voice input is not supported on this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript
      if (transcript) setNewMessage((prev) => `${prev} ${transcript}`.trim())
    }
    recognition.start()
  }

  useEffect(() => {
    syncFromServerStatus()
  }, [user?.userId])

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/messages/${conversation.id}?userId=${encodeURIComponent(user?.userId || '')}`)
        const result = await response.json()
        if (result.success) {
          setMessages((result.data || []).map((message: any) => mapMessage(message, user?.userId)))
        }
      } catch (error) {
        console.error("Failed to load messages:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversation.id, user?.userId])

  const billTotal = billForm.lineItems.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity || 1), 0) - Number(billForm.discountAmount || 0)

  const handleSendBill = async () => {
    if (!billForm.scopeSummary.trim()) { setBillError('Scope summary is required'); return }
    if (!billForm.lineItems[0]?.description.trim()) { setBillError('Add at least one line item'); return }

    const resolvedMerchantId = merchantId || user?.userId
    if (!resolvedMerchantId) { setBillError('Merchant ID missing'); return }

    const buyerId = String(conversation.vendorId)
    setSendingBill(true)
    setBillError('')

    try {
      const createRes = await fetch('/api/service-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: resolvedMerchantId,
          buyerId,
          scopeSummary: billForm.scopeSummary,
          timeline: billForm.timeline,
          lineItems: billForm.lineItems.filter((i) => i.description.trim()),
          discountAmount: Number(billForm.discountAmount || 0),
          notes: billForm.notes,
          validUntil: billForm.validUntil || null,
        }),
      })

      const createResult = await createRes.json()
      if (!createResult.success) {
        setBillError(createResult.error || 'Failed to create bill')
        return
      }

      const billId = createResult.data?.id
      const sendRes = await fetch('/api/service-bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', billId, merchantId: resolvedMerchantId }),
      })

      const sendResult = await sendRes.json()
      if (!sendResult.success) {
        setBillError(sendResult.error || 'Bill created but could not send')
        return
      }

      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: resolvedMerchantId,
          content: `📋 I've sent you a service bill for ${formatNaira(billTotal)}. Scope: "${billForm.scopeSummary}". Check your Bills tab to review and pay securely.`,
        }),
      })

      setShowBillForm(false)
      setShowQuickActions(false)
      setBillForm({ scopeSummary: '', timeline: '', lineItems: [{ description: '', quantity: 1, unit_price: 0 }], discountAmount: '', notes: '', validUntil: '' })

      const msgRes = await fetch(`/api/messages/${conversation.id}?userId=${encodeURIComponent(resolvedMerchantId)}`)
      const msgResult = await msgRes.json()
      if (msgResult.success) setMessages((msgResult.data || []).map((m: any) => mapMessage(m, resolvedMerchantId)))
    } catch {
      setBillError('Unable to send bill. Try again.')
    } finally {
      setSendingBill(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.userId || sending || suspended) return

    setError("")
    setWarning("")

    setSending(true)
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: user.userId,
          content: newMessage,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessages((prev) => [...prev, mapMessage(result.data, user.userId)])
        setNewMessage("")
      } else {
        if (result.code === 'POLICY_CONTACT_REQUEST_BLOCKED' || result.code === 'POLICY_USER_SUSPENDED') {
          const nextStrikes = Number(result.strikes || 0)
          const nextSuspended = Boolean(result.suspended)
          const nextRemainingMs = Number(result.remainingMs || 0)

          syncSafetyStateFromServer(user.userId, {
            strikes: nextStrikes,
            suspended: nextSuspended,
            remainingMs: nextRemainingMs,
          })

          setStrikeCount(nextStrikes)

          if (nextSuspended) {
            setSuspended(true)
            setError(result.error || "Your account has been temporarily suspended for violating platform policies.")
          } else {
            setWarning(result.error || "For your safety, please keep all conversations within the platform.")
          }
          return
        }

        setError(result.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {suspended ? (
        <div className="p-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="font-semibold text-red-700 mb-1">Account Suspended</p>
            <p className="text-sm text-red-700">
              Your account has been temporarily suspended for violating platform policies.
            </p>
            <p className="text-xs text-red-600 mt-2">Strikes: {strikeCount}</p>
            <button
              onClick={() => {
                resetSafetyState(user?.userId)
                setStrikeCount(0)
                setSuspended(false)
                setError("")
                setWarning("")
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-sm font-medium"
            >
              Reset Strikes (Demo)
            </button>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="font-semibold text-foreground">{conversation.vendorName}</h2>
              <p className="text-xs text-muted-foreground">{conversation.vendorLocation}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setWarning("Voice calls are disabled. Please continue in-app chat for secure onboarding.")
            }}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Call merchant"
          >
            <Phone className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {warning && (
          <div className="rounded-xl border border-[#E8D7FF] bg-[#F3E8FF] px-3 py-2 text-sm text-[#6C2BD9]">
            {warning}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No messages yet. Say hello to start the conversation.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "buyer" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  msg.sender === "buyer"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary text-foreground rounded-bl-none"
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${
                    msg.sender === "buyer" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.sender === "buyer" && (
                    <div className="ml-1">{msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {userRole === 'merchant' ? (
        <>
          {showBillForm && (
            <div className="border-t border-border bg-card px-4 pt-3 pb-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Send Bill to {conversation.vendorName}</p>
                <button onClick={() => { setShowBillForm(false); setBillError('') }} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              {billError && <p className="text-xs text-destructive">{billError}</p>}
              <div>
                <input value={billForm.scopeSummary} onChange={(e) => setBillForm((p) => ({ ...p, scopeSummary: e.target.value }))} placeholder="What are you billing for? e.g. Deep house cleaning" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={billForm.timeline} onChange={(e) => setBillForm((p) => ({ ...p, timeline: e.target.value }))} placeholder="Timeline e.g. 1 day" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                <input type="date" value={billForm.validUntil} onChange={(e) => setBillForm((p) => ({ ...p, validUntil: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Line Items</p>
                  <button onClick={() => setBillForm((p) => ({ ...p, lineItems: [...p.lineItems, { description: '', quantity: 1, unit_price: 0 }] }))} className="text-xs text-primary font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Add row</button>
                </div>
                <div className="grid grid-cols-12 gap-1 mb-1">
                  <p className="col-span-6 text-[10px] text-muted-foreground">Item</p>
                  <p className="col-span-2 text-[10px] text-muted-foreground text-center">Qty</p>
                  <p className="col-span-3 text-[10px] text-muted-foreground">Price (₦)</p>
                </div>
                {billForm.lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <input value={item.description} onChange={(e) => setBillForm((p) => { const li = [...p.lineItems]; li[i] = { ...li[i], description: e.target.value }; return { ...p, lineItems: li } })} placeholder="Description" className="col-span-6 rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
                    <input type="number" min={1} value={item.quantity} onChange={(e) => setBillForm((p) => { const li = [...p.lineItems]; li[i] = { ...li[i], quantity: Number(e.target.value) }; return { ...p, lineItems: li } })} className="col-span-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center" />
                    <input type="number" min={0} value={item.unit_price || ''} onChange={(e) => setBillForm((p) => { const li = [...p.lineItems]; li[i] = { ...li[i], unit_price: Number(e.target.value) }; return { ...p, lineItems: li } })} placeholder="0" className="col-span-3 rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
                    {billForm.lineItems.length > 1 && (
                      <button onClick={() => setBillForm((p) => ({ ...p, lineItems: p.lineItems.filter((_, j) => j !== i) }))} className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} value={billForm.discountAmount} onChange={(e) => setBillForm((p) => ({ ...p, discountAmount: e.target.value }))} placeholder="Discount (₦)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{formatNaira(Math.max(0, billTotal))}</span>
                </div>
              </div>
              <textarea value={billForm.notes} onChange={(e) => setBillForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[52px]" />
              <button onClick={handleSendBill} disabled={sendingBill} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {sendingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {sendingBill ? 'Sending...' : 'Send Bill'}
              </button>
            </div>
          )}
          {!showBillForm && (
            <div className="border-t border-border bg-card px-4 py-2.5">
              <button onClick={() => setShowBillForm(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                <FileText className="w-4 h-4" /> Send Bill to Buyer
              </button>
            </div>
          )}
        </>
      ) : (
        showQuickActions && (
          <div className="border-t border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (onViewStore) onViewStore(conversation); else window.location.href = "/" }}
                className="flex items-center justify-center gap-2 p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors text-sm font-medium text-foreground"
              >
                <Store className="w-4 h-4" />
                View Store
              </button>
              <button
                onClick={() => { if (onPlaceOrder) onPlaceOrder(conversation); else window.location.href = "/" }}
                className="flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary/90 rounded-xl transition-colors text-sm font-medium text-primary-foreground"
              >
                <ShoppingCart className="w-4 h-4" />
                Browse Products
              </button>
            </div>
          </div>
        )
      )}

      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 flex items-center gap-2 bg-input rounded-2xl px-4 py-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value
                setNewMessage(value)
                if (containsBlockedContactRequest(value)) {
                  setWarning("For your safety, please keep all conversations within the platform.")
                } else {
                  setWarning("")
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage()
              }}
              placeholder={suspended ? "Messaging disabled due to suspension" : "Type a message..."}
              disabled={suspended}
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm"
            />
            <button
              onClick={handleVoiceInput}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Voice input"
            >
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || suspended}
            className="flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {sending ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : <Send className="w-5 h-5 text-primary-foreground" />}
          </button>
        </div>
      </div>

      <div className="border-t border-border bg-secondary/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 For your safety, keep all communication within the platform
        </p>
      </div>
    </div>
  )
}

export function ChatInterface({
  initialConversation = null,
  onUnreadChange,
  onViewStore,
  onPlaceOrder,
  userRole,
  merchantId,
}: {
  initialConversation?: Conversation | null
  onUnreadChange?: (count: number) => void
  onViewStore?: (conversation: Conversation) => void
  onPlaceOrder?: (conversation: Conversation) => void
  userRole?: 'merchant' | 'buyer'
  merchantId?: string
}) {
  const { user } = useRole()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(initialConversation)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversation ? [initialConversation] : [])
  const [loading, setLoading] = useState(true)
  const [suspended, setSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)

  const refreshSafetyStatus = async () => {
    if (!user?.userId) {
      setSuspended(false)
      setStrikeCount(0)
      return
    }

    try {
      const response = await fetch(`/api/safety/status?userId=${encodeURIComponent(user.userId)}`)
      const result = await response.json()
      if (result.success) {
        const nextStrikes = Number(result.strikes || 0)
        const nextSuspended = Boolean(result.suspended)
        const nextRemainingMs = Number(result.remainingMs || 0)

        syncSafetyStateFromServer(user.userId, {
          strikes: nextStrikes,
          suspended: nextSuspended,
          remainingMs: nextRemainingMs,
        })

        setStrikeCount(nextStrikes)
        setSuspended(nextSuspended)
        return
      }
    } catch (error) {
      console.error("Failed to fetch safety status:", error)
    }

    setSuspended(isUserSuspended(user.userId))
    setStrikeCount(getUserStrikeCount(user.userId))
  }

  const loadConversations = async () => {
    if (suspended) {
      setLoading(false)
      return
    }

    if (!user?.userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/messages/conversation?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        const mapped = (result.data || []).map((conversation: any) => mapConversation(conversation, user.userId))
        setConversations(mapped)

        if (initialConversation) {
          const matched = mapped.find((conversation: Conversation) => conversation.id === initialConversation.id)
          if (matched) {
            setSelectedConversation(matched)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSafetyStatus()
  }, [user?.userId])

  useEffect(() => {
    if (initialConversation) {
      setSelectedConversation(initialConversation)
    }
  }, [initialConversation])

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => sum + Number(conv.unread || 0), 0)
    onUnreadChange?.(totalUnread)
  }, [conversations, onUnreadChange])

  useEffect(() => {
    loadConversations()
  }, [user?.userId, initialConversation, suspended])

  if (suspended) {
    return (
      <div className="h-full p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="font-semibold text-red-700 mb-1">Account Suspended</p>
          <p className="text-sm text-red-700">
            Your account has been temporarily suspended for violating platform policies.
          </p>
          <p className="text-xs text-red-600 mt-2">Strikes: {strikeCount}</p>
          <button
            onClick={() => {
              resetSafetyState(user?.userId)
              setStrikeCount(0)
              setSuspended(false)
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-sm font-medium"
          >
            Reset Strikes (Demo)
          </button>
        </div>
      </div>
    )
  }

  if (selectedConversation) {
    return <ChatConversationScreen conversation={selectedConversation} onBack={() => setSelectedConversation(null)} onViewStore={onViewStore} onPlaceOrder={onPlaceOrder} userRole={userRole} merchantId={merchantId} />
  }

  return (
    <ChatListScreen
      conversations={conversations}
      loading={loading}
      onSelectConversation={(conversation) => {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversation.id ? { ...conv, unread: 0 } : conv
          )
        )
        setSelectedConversation({ ...conversation, unread: 0 })
      }}
      onRefresh={loadConversations}
    />
  )
}

function formatTime(date: Date): string {
  const timestamp = new Date(date)
  if (Number.isNaN(timestamp.getTime())) return "Now"

  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
