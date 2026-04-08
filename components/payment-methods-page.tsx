"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import { 
  getPaymentMethods, 
  addPaymentMethod, 
  removePaymentMethod, 
  setDefaultPaymentMethod 
} from "@/lib/user-actions"
import { 
  ArrowLeft, 
  CreditCard, 
  Plus, 
  Trash2, 
  Star, 
  Loader2, 
  X,
  CheckCircle2
} from "lucide-react"

interface PaymentMethod {
  id: string
  card_type: string
  card_last_four: string
  card_holder_name: string
  expiry_month: number
  expiry_year: number
  is_default: boolean
}

interface PaymentMethodsPageProps {
  onBack: () => void
}

export function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps) {
  const { user } = useRole()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // New card form state
  const [cardNumber, setCardNumber] = useState("")
  const [cardHolder, setCardHolder] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [cardType, setCardType] = useState("visa")

  useEffect(() => {
    loadPaymentMethods()
  }, [user?.userId])

  const loadPaymentMethods = async () => {
    if (!user?.userId) return
    
    setLoading(true)
    try {
      const result = await getPaymentMethods(user.userId)
      if (result.success && result.data) {
        setPaymentMethods(result.data)
      }
    } catch (err) {
      console.error("Error loading payment methods:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    if (!user?.userId) return
    
    // Basic validation
    if (cardNumber.replace(/\s/g, "").length < 16) {
      setError("Please enter a valid card number")
      return
    }
    
    if (!cardHolder.trim()) {
      setError("Please enter the card holder name")
      return
    }
    
    const month = parseInt(expiryMonth)
    const year = parseInt(expiryYear)
    
    if (!month || month < 1 || month > 12) {
      setError("Please enter a valid expiry month (1-12)")
      return
    }
    
    const currentYear = new Date().getFullYear()
    if (!year || year < currentYear || year > currentYear + 20) {
      setError("Please enter a valid expiry year")
      return
    }

    setSaving(true)
    try {
      const result = await addPaymentMethod(user.userId, {
        card_type: detectCardType(cardNumber),
        card_last_four: cardNumber.replace(/\s/g, "").slice(-4),
        card_holder_name: cardHolder.trim(),
        expiry_month: month,
        expiry_year: year,
        is_default: paymentMethods.length === 0,
      })

      if (result.success) {
        setSuccess("Card added successfully!")
        setShowAddCard(false)
        resetForm()
        loadPaymentMethods()
      } else {
        setError(result.error || "Failed to add card")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCard = async (cardId: string) => {
    if (!user?.userId) return
    
    setError("")
    try {
      const result = await removePaymentMethod(user.userId, cardId)
      if (result.success) {
        setSuccess("Card removed")
        loadPaymentMethods()
      } else {
        setError(result.error || "Failed to remove card")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    }
  }

  const handleSetDefault = async (cardId: string) => {
    if (!user?.userId) return
    
    setError("")
    try {
      const result = await setDefaultPaymentMethod(user.userId, cardId)
      if (result.success) {
        setSuccess("Default card updated")
        loadPaymentMethods()
      } else {
        setError(result.error || "Failed to update default card")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    }
  }

  const detectCardType = (number: string): string => {
    const cleaned = number.replace(/\s/g, "")
    if (cleaned.startsWith("4")) return "visa"
    if (/^5[1-5]/.test(cleaned)) return "mastercard"
    if (/^3[47]/.test(cleaned)) return "amex"
    if (/^6(?:011|5)/.test(cleaned)) return "discover"
    return "visa"
  }

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16)
    const groups = cleaned.match(/.{1,4}/g)
    return groups ? groups.join(" ") : cleaned
  }

  const resetForm = () => {
    setCardNumber("")
    setCardHolder("")
    setExpiryMonth("")
    setExpiryYear("")
    setCardType("visa")
  }

  const getCardIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "visa":
        return <span className="text-blue-600 font-bold text-xs">VISA</span>
      case "mastercard":
        return <span className="text-orange-600 font-bold text-xs">MC</span>
      case "amex":
        return <span className="text-blue-800 font-bold text-xs">AMEX</span>
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Payment Methods</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Saved Cards */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground px-1">Saved Cards</h2>
                {paymentMethods.map((card) => (
                  <div
                    key={card.id}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-8 bg-secondary rounded-lg flex items-center justify-center">
                      {getCardIcon(card.card_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          •••• {card.card_last_four}
                        </span>
                        {card.is_default && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {card.expiry_month.toString().padStart(2, "0")}/{card.expiry_year}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!card.is_default && (
                        <button
                          onClick={() => handleSetDefault(card.id)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveCard(card.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove card"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No Cards Saved</h3>
                <p className="text-sm text-muted-foreground">
                  Add a card to make checkout faster
                </p>
              </div>
            )}

            {/* Add Card Button */}
            {!showAddCard && (
              <button
                onClick={() => setShowAddCard(true)}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add New Card
              </button>
            )}

            {/* Add Card Form */}
            {showAddCard && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Add New Card</h3>
                  <button
                    onClick={() => {
                      setShowAddCard(false)
                      resetForm()
                      setError("")
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddCard} className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        maxLength={19}
                      />
                    </div>
                  </div>

                  {/* Card Holder */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Card Holder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Expiry Month
                      </label>
                      <input
                        type="number"
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value)}
                        placeholder="MM"
                        min="1"
                        max="12"
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Expiry Year
                      </label>
                      <input
                        type="number"
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value)}
                        placeholder="YYYY"
                        min={new Date().getFullYear()}
                        max={new Date().getFullYear() + 20}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding Card...
                      </>
                    ) : (
                      "Add Card"
                    )}
                  </button>
                </form>

                <p className="text-xs text-muted-foreground text-center">
                  Your card information is securely encrypted
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
