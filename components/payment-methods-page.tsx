"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Plus, Send, Wallet } from "lucide-react"
import { useRole } from "@/lib/role-context"

interface PaymentMethodsPageProps {
  onBack: () => void
}

interface WalletTransaction {
  id: string
  type: "credit" | "debit"
  amount: number
  description: string
  date: string
}

const DEFAULT_BALANCE = 0
const QUICK_ADD_AMOUNTS = [1000, 5000, 10000]
const DEMO_CHARGE_AMOUNT = 1500

export function PaymentMethodsPage({ onBack }: PaymentMethodsPageProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(DEFAULT_BALANCE)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [amountInput, setAmountInput] = useState("1000")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const storageKey = user?.userId ? `wallet_balance_${user.userId}` : "wallet_balance_guest"
  const transactionKey = `${storageKey}_transactions`

  useEffect(() => {
    setLoading(true)
    try {
      const storedBalance = localStorage.getItem(storageKey)
      const parsedBalance = storedBalance ? Number(storedBalance) : DEFAULT_BALANCE
      setBalance(Number.isFinite(parsedBalance) ? parsedBalance : DEFAULT_BALANCE)

      const storedTransactions = localStorage.getItem(transactionKey)
      const parsedTransactions = storedTransactions
        ? (JSON.parse(storedTransactions) as WalletTransaction[])
        : []
      setTransactions(Array.isArray(parsedTransactions) ? parsedTransactions : [])
    } catch {
      setError("Could not load wallet from local storage")
      setBalance(DEFAULT_BALANCE)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [storageKey, transactionKey])

  useEffect(() => {
    if (loading) return

    localStorage.setItem(storageKey, balance.toString())
    localStorage.setItem(transactionKey, JSON.stringify(transactions))
  }, [balance, loading, storageKey, transactionKey, transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const appendTransaction = (transaction: WalletTransaction) => {
    setTransactions((prev) => [transaction, ...prev].slice(0, 12))
  }

  const handleAddMoney = (amount?: number) => {
    setError("")
    setSuccess("")

    const parsedAmount = amount ?? Number(amountInput)
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount to fund your wallet")
      return
    }

    setBalance((prev) => prev + parsedAmount)
    appendTransaction({
      id: crypto.randomUUID(),
      type: "credit",
      amount: parsedAmount,
      description: "Wallet funding",
      date: new Date().toISOString(),
    })
    setSuccess(`${formatCurrency(parsedAmount)} added successfully`)
  }

  const handlePayWithWallet = () => {
    setError("")
    setSuccess("")

    if (balance < DEMO_CHARGE_AMOUNT) {
      setError("Insufficient wallet balance. Add money to continue.")
      return
    }

    setBalance((prev) => prev - DEMO_CHARGE_AMOUNT)
    appendTransaction({
      id: crypto.randomUUID(),
      type: "debit",
      amount: DEMO_CHARGE_AMOUNT,
      description: "Wallet payment",
      date: new Date().toISOString(),
    })
    setSuccess(`Payment of ${formatCurrency(DEMO_CHARGE_AMOUNT)} completed`)
  }

  const cardClasses =
    "rounded-3xl bg-white shadow-[0_10px_35px_rgba(25,25,25,0.08)] border border-[#F0E7FF]"

  return (
    <div className="min-h-screen bg-white text-[#2E2E2E]">
      <header className="sticky top-0 z-50 border-b border-[#F3E8FF] bg-white/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-[#6B7280] hover:text-[#6C2BD9] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Wallet</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5 space-y-5">
        <section className="rounded-3xl p-5 text-white shadow-[0_14px_40px_rgba(108,43,217,0.35)] bg-gradient-to-br from-[#6C2BD9] via-[#7A37E6] to-[#9A6AF0]">
          <p className="text-sm text-white/80">Available Balance</p>
          {loading ? (
            <div className="py-6 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm text-white/90">Loading wallet...</span>
            </div>
          ) : (
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight">{formatCurrency(balance)}</h2>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/80">
            <Wallet className="w-4 h-4" />
            <span>Secure wallet powered by local storage</span>
          </div>
        </section>

        {(error || success) && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              error
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-[#F3E8FF] text-[#6C2BD9] border border-[#E8D7FF]"
            }`}
          >
            {error || success}
          </div>
        )}

        <section className={`${cardClasses} p-4 space-y-4`}>
          <div>
            <label className="text-sm font-medium text-[#4B5563]">Fund Wallet Amount</label>
            <input
              type="number"
              min="1"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="Enter amount"
              className="mt-2 w-full rounded-2xl border border-[#E6D8FF] bg-[#FCFAFF] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6C2BD9]/30"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_ADD_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAddMoney(amount)}
                  className="rounded-full bg-[#F3E8FF] text-[#6C2BD9] px-3 py-1.5 text-xs font-semibold hover:bg-[#EAD7FF] transition-colors"
                >
                  +{formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleAddMoney()}
              className="w-full rounded-2xl bg-[#6C2BD9] text-white font-semibold py-3 shadow-[0_8px_20px_rgba(108,43,217,0.28)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Money
            </button>
            <button
              onClick={handlePayWithWallet}
              className="w-full rounded-2xl bg-[#6C2BD9] text-white font-semibold py-3 shadow-[0_8px_20px_rgba(108,43,217,0.28)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Pay with Wallet
            </button>
          </div>

          <p className="text-xs text-[#6B7280]">
            Demo payment charge: {formatCurrency(DEMO_CHARGE_AMOUNT)}
          </p>
        </section>

        <section className={`${cardClasses} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Transactions</h3>
            <span className="text-xs text-[#6B7280]">Latest activity</span>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-2xl bg-[#FAF5FF] border border-[#F3E8FF] p-4 text-sm text-[#6B7280]">
              No transactions yet. Add money to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-[#F2EBFF] bg-white px-3 py-2.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-[#6B7280]">
                      {new Date(transaction.date).toLocaleString("en-NG", {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      transaction.type === "credit" ? "text-green-600" : "text-[#6C2BD9]"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
