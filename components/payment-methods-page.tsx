"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Wallet, Landmark, RefreshCw, ArrowDownLeft, ArrowUpRight, Plus, Trash2, CreditCard, ShoppingBag } from "lucide-react"
import { useRole } from "@/lib/role-context"
import { formatNaira } from "@/lib/currency-utils"
import { MerchantWithdrawal } from "@/components/merchant-withdrawal"

interface PaymentMethodsPageProps {
  onBack: () => void
}

interface WalletTransactionRow {
  id: string
  type?: string | null
  amount?: number | null
  reason?: string | null
  status?: string | null
  created_at?: string | null
}

interface BuyerOrder {
  id: string
  status?: string | null
  grand_total?: number | null
  product_total?: number | null
  delivery_fee?: number | null
  payment_method?: string | null
  created_at?: string | null
}

interface SavedPaymentMethod {
  id: string
  type?: string | null
  details?: any
  is_default?: boolean | null
  created_at?: string | null
}

function BuyerWalletSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [pmError, setPmError] = useState("")
  const [showAddCard, setShowAddCard] = useState(false)
  const [newMethodType, setNewMethodType] = useState("card")
  const [newMethodDetails, setNewMethodDetails] = useState("")
  const [addingMethod, setAddingMethod] = useState(false)
  const [removingId, setRemovingId] = useState("")

  const loadData = async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const [ordRes, pmRes] = await Promise.all([
        fetch(`/api/buyer/orders?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
        fetch(`/api/user/payment-methods?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
      ])
      const ordData = await ordRes.json().catch(() => ({}))
      const pmData = await pmRes.json().catch(() => ({}))
      setOrders(Array.isArray(ordData?.data) ? ordData.data : Array.isArray(ordData?.orders) ? ordData.orders : [])
      setPaymentMethods(Array.isArray(pmData?.data) ? pmData.data : [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [userId])

  const totalSpent = orders.reduce((s, o) => s + (Number(o.grand_total) || 0), 0)
  const escrowHeld = orders
    .filter(o => o.status && !['delivered','completed','cancelled'].includes(o.status))
    .reduce((s, o) => s + (Number(o.product_total) || Number(o.grand_total) || 0), 0)

  const handleAddMethod = async () => {
    if (!newMethodDetails.trim()) return
    setAddingMethod(true)
    setPmError("")
    try {
      const res = await fetch('/api/user/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method: { type: newMethodType, details: { label: newMethodDetails.trim() } } }),
      })
      const result = await res.json()
      if (!result?.success) { setPmError(result?.error || 'Failed to add method'); return }
      setNewMethodDetails("")
      setShowAddCard(false)
      await loadData()
    } catch { setPmError('Could not add payment method.') }
    finally { setAddingMethod(false) }
  }

  const handleRemoveMethod = async (methodId: string) => {
    setRemovingId(methodId)
    try {
      await fetch(`/api/user/payment-methods?userId=${userId}&methodId=${methodId}`, { method: 'DELETE' })
      await loadData()
    } catch { /* ignore */ }
    finally { setRemovingId("") }
  }

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading wallet...</span>
      </div>
    )
  }

  return (
    <>
      {/* Summary cards */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Spent</p>
          <p className="text-base font-bold text-foreground">{formatNaira(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Orders</p>
          <p className="text-base font-bold text-foreground">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">In Escrow</p>
          <p className="text-base font-bold text-amber-600">{formatNaira(escrowHeld)}</p>
        </div>
      </section>

      {/* Saved payment methods */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Saved Payment Methods</h3>
          <button
            onClick={() => setShowAddCard(v => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {showAddCard && (
          <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
            <select
              value={newMethodType}
              onChange={e => setNewMethodType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="card">Debit / Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="palmpay">PalmPay</option>
              <option value="opay">OPay</option>
            </select>
            <input
              type="text"
              placeholder={newMethodType === 'card' ? 'Card nickname (e.g. GTB Visa ****1234)' : 'Account label'}
              value={newMethodDetails}
              onChange={e => setNewMethodDetails(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {pmError && <p className="text-xs text-red-600">{pmError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddMethod}
                disabled={addingMethod}
                className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-60"
              >
                {addingMethod ? 'Saving...' : 'Save Method'}
              </button>
              <button onClick={() => setShowAddCard(false)} className="px-4 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        )}

        {paymentMethods.length === 0 ? (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
            No saved payment methods yet.
          </div>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{pm.type?.replace(/_/g,' ') || 'Payment method'}</p>
                  <p className="text-xs text-muted-foreground">{pm.details?.label || pm.details?.account_number || JSON.stringify(pm.details || {})}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {pm.is_default && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Default</span>}
                  <button
                    onClick={() => handleRemoveMethod(pm.id)}
                    disabled={removingId === pm.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {removingId === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <h3 className="font-semibold">Order History</h3>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 10).map(order => {
              const statusColor: Record<string,string> = {
                delivered: 'text-emerald-600', completed: 'text-emerald-600',
                shipped: 'text-blue-600', in_transit: 'text-blue-600',
                cancelled: 'text-red-600', pending: 'text-amber-600',
              }
              const color = statusColor[String(order.status || '')] || 'text-muted-foreground'
              return (
                <div key={order.id} className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium truncate">Order #{order.id.substring(0,8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at || '').toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatNaira(Number(order.grand_total) || 0)}</p>
                    <p className={`text-xs font-medium capitalize ${color}`}>{String(order.status || '').replace(/_/g,' ')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [fundAmount, setFundAmount] = useState("5000")
  const [funding, setFunding] = useState(false)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([])
  const [error, setError] = useState("")
  const [lastLoaded, setLastLoaded] = useState<string>("")

  const isMerchant = user?.role === "merchant"
  const authUserId = String(user?.userId || "").trim()
  const merchantId = String(user?.email || user?.userId || "").trim()

  const loadMerchantWallet = async () => {
    if (!merchantId) {
      setLoading(false)
      setBalance(0)
      setTransactions([])
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/merchant/wallet?merchantId=${encodeURIComponent(merchantId)}`, {
        cache: "no-store",
      })
      const result = await response.json()

      if (!result?.success) {
        setError(result?.error || "Failed to load wallet")
        setBalance(0)
        setTransactions([])
        return
      }

      setBalance(Number(result.balance || 0))
      setTransactions(Array.isArray(result.transactions) ? result.transactions : [])
      setLastLoaded(new Date().toISOString())
    } catch {
      setError("Could not load wallet. Please try again.")
      setBalance(0)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isMerchant) {
      setLoading(false)
      return
    }

    loadMerchantWallet()
  }, [isMerchant, merchantId])

  const creditTypes = new Set(["wallet_credit", "escrow_release", "payment"])
  const debitTypes = new Set(["withdrawal", "wallet_debit"])

  const handleFundWallet = async () => {
    const amount = Number(fundAmount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid funding amount')
      return
    }

    if (!authUserId || !merchantId) {
      setError('Merchant identity is missing. Please sign in again.')
      return
    }

    setFunding(true)
    setError("")
    try {
      const response = await fetch('/api/merchant/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId,
          merchantId,
          amount,
          reason: `Merchant funded wallet with ${formatNaira(amount)}`,
        }),
      })

      const result = await response.json()
      if (!result?.success) {
        setError(result?.error || 'Failed to fund wallet')
        return
      }

      setFundAmount('5000')
      await loadMerchantWallet()
    } catch {
      setError('Could not fund wallet. Please try again.')
    } finally {
      setFunding(false)
    }
  }

  const totalIn = transactions.reduce((sum, tx) => {
    const type = String(tx.type || "").toLowerCase().trim()
    const amount = Number(tx.amount || 0)
    if (creditTypes.has(type) && Number.isFinite(amount) && amount > 0) return sum + amount
    return sum
  }, 0)

  const totalOut = transactions.reduce((sum, tx) => {
    const type = String(tx.type || "").toLowerCase().trim()
    const amount = Number(tx.amount || 0)
    if (debitTypes.has(type) && Number.isFinite(amount) && amount > 0) return sum + amount
    return sum
  }, 0)

  if (showWithdraw && merchantId) {
    return (
      <MerchantWithdrawal
        merchantId={merchantId}
        walletBalance={balance}
        onBack={() => setShowWithdraw(false)}
        onSuccess={() => {
          setShowWithdraw(false)
          loadMerchantWallet()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-xl flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Wallet & Payments</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-5 space-y-5">
        {isMerchant ? (
          <>
            <section className="rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
              <p className="text-sm text-slate-300">Available Balance</p>
              {loading ? (
                <div className="py-6 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm text-slate-200">Loading wallet...</span>
                </div>
              ) : (
                <h2 className="mt-2 text-4xl font-extrabold tracking-tight">{formatNaira(balance)}</h2>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-300">
                <Wallet className="w-4 h-4" />
                <span>Live wallet backed by escrow settlements</span>
              </div>
            </section>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/60 p-3 border border-border">
                <p className="text-xs text-muted-foreground">Total Credits</p>
                <p className="text-lg font-bold text-emerald-600">{formatNaira(totalIn)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3 border border-border">
                <p className="text-xs text-muted-foreground">Total Withdrawn</p>
                <p className="text-lg font-bold text-red-600">{formatNaira(totalOut)}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Wallet Actions</h3>
                <button
                  onClick={loadMerchantWallet}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="w-full rounded-xl border border-border bg-muted/50 py-3 px-4">
                  <label className="text-xs text-muted-foreground block mb-1">Add Funds</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={fundAmount}
                      onChange={(event) => setFundAmount(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Amount"
                    />
                    <button
                      onClick={handleFundWallet}
                      disabled={funding}
                      className="rounded-lg bg-emerald-600 text-white text-xs font-semibold px-3 py-2 hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {funding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 transition-opacity"
                >
                  Withdraw Funds
                </button>
                <div className="w-full rounded-xl border border-border bg-muted/50 py-3 px-4 text-sm text-muted-foreground flex items-center gap-2 sm:col-span-2">
                  <Landmark className="w-4 h-4" />
                  Wallet funding is instant after confirmation. Bank transfer withdrawals settle within 24 hours.
                </div>
              </div>

              {lastLoaded && (
                <p className="text-[11px] text-muted-foreground">Updated {new Date(lastLoaded).toLocaleString()}</p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recent Activity</h3>
                <span className="text-xs text-muted-foreground">Latest {Math.min(10, transactions.length)}</span>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
                  No wallet activity yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((tx) => {
                    const type = String(tx.type || '').toLowerCase()
                    const isDebit = type.includes('withdraw') || type.includes('debit')
                    const amount = Number(tx.amount || 0)
                    return (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-sm font-medium truncate">{tx.reason || tx.type || 'Wallet activity'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at || '').toLocaleString()} • {tx.status || 'completed'}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold ${isDebit ? 'text-red-600' : 'text-emerald-600'} flex items-center gap-1`}>
                          {isDebit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          {isDebit ? '-' : '+'}{formatNaira(Math.abs(amount))}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <BuyerWalletSection userId={authUserId} />
        )}
      </main>
    </div>
  )
}
