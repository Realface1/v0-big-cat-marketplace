"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Building2, CalendarDays, Mail, Phone, Plus, UserRound, Loader2, CheckCircle2, Copy, ShieldCheck } from "lucide-react"

interface MerchantOnboardingIntakeProps {
  onBack: () => void
}

const ONBOARDING_FEE = 2000
const BANK_NAME = "Zenith Bank"
const ACCOUNT_NUMBER = "1234567890"
const ACCOUNT_NAME = "BigCat Marketplace Ltd"

export function MerchantOnboardingIntake({ onBack }: MerchantOnboardingIntakeProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [requestId, setRequestId] = useState("")
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [customCategoryInput, setCustomCategoryInput] = useState("")
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [categories, setCategories] = useState([
    "Retail",
    "Fashion",
    "Food & Beverage",
    "Agriculture",
    "Technology",
    "Beauty & Wellness",
    "Manufacturing",
    "Services",
  ])
  const [form, setForm] = useState({
    business_name: "",
    category: "",
    date_of_commencement: "",
    owner_name: "",
    phone: "",
    email: "",
  })

  const canProceed = useMemo(() => {
    return Boolean(
      form.business_name.trim() &&
        form.category.trim() &&
        form.date_of_commencement.trim() &&
        form.owner_name.trim() &&
        form.phone.trim() &&
        form.email.trim()
    )
  }, [form])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addCategory = () => {
    const next = customCategoryInput.trim()
    if (!next) return
    if (!categories.some((cat) => cat.toLowerCase() === next.toLowerCase())) {
      setCategories((prev) => [...prev, next])
    }
    updateField("category", next)
    setCustomCategoryInput("")
    setShowCustomCategoryInput(false)
  }

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canProceed) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/onboarding/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const result = await response.json()
      if (result.success) {
          setRequestId(result.request?.id || result.id || "")
          setSubmitted(true)
      } else {
        setError(result.error || "Could not submit onboarding request")
      }
    } catch {
      setError("Could not submit onboarding request")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const confirmPayment = async () => {
    if (!requestId) return
    setPaymentLoading(true)
    setPaymentError("")
    try {
      const response = await fetch("/api/onboarding/fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_request_id: requestId }),
      })
      const result = await response.json()
      if (result.success) {
        setPaymentConfirmed(true)
      } else {
        setPaymentError(result.error || "Could not confirm payment. Please try again.")
      }
    } catch {
      setPaymentError("Could not confirm payment. Please try again.")
    } finally {
      setPaymentLoading(false)
    }
  }

  if (submitted) {
    if (paymentConfirmed) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#091329] to-[#020617] text-white flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center">
            <ShieldCheck className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Payment Received & Escrowed</h2>
            <p className="text-blue-100/85 text-sm md:text-base">
              Your ₦2,000 onboarding fee is safely held in escrow. It will be released to your assigned agent once they complete your onboarding.
            </p>
            <p className="text-blue-200/60 text-xs mt-3">
              An agent has been assigned and will contact you via email or phone shortly.
            </p>
            <button
              onClick={onBack}
              className="mt-7 inline-flex items-center justify-center rounded-xl px-5 py-3 bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#091329] to-[#020617] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-blue-100/85 text-sm mb-6">
            One last step — pay the ₦2,000 onboarding fee to activate your slot and get assigned to an agent.
          </p>

          {/* Payment details */}
          <div className="text-left rounded-2xl border border-blue-300/20 bg-blue-900/30 p-5 space-y-3 mb-6">
            <p className="text-xs uppercase tracking-widest text-blue-300/70 font-semibold mb-3">Bank Transfer Details</p>

            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-sm">Amount</span>
              <span className="font-bold text-emerald-400 text-lg">₦2,000</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-sm">Bank</span>
              <span className="font-medium text-white">{BANK_NAME}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-sm">Account Number</span>
              <button
                onClick={() => copyToClipboard(ACCOUNT_NUMBER)}
                className="flex items-center gap-2 font-mono font-bold text-white hover:text-blue-300 transition-colors"
              >
                {ACCOUNT_NUMBER}
                <Copy className="w-3.5 h-3.5" />
                {copied && <span className="text-xs text-emerald-400">Copied!</span>}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-sm">Account Name</span>
              <span className="font-medium text-white">{ACCOUNT_NAME}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-blue-200/70 text-sm">Narration / Reference</span>
              <button
                onClick={() => copyToClipboard(form.phone || form.email)}
                className="flex items-center gap-2 font-medium text-white hover:text-blue-300 transition-colors text-sm"
              >
                {form.phone || form.email}
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-blue-200/60 text-xs mb-5">
            After transferring, tap the button below. Your payment will be held securely in escrow and released to your agent after they complete your onboarding.
          </p>

          {paymentError && (
            <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
              {paymentError}
            </div>
          )}

          <button
            onClick={confirmPayment}
            disabled={paymentLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-sm font-semibold"
          >
            {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            I have transferred ₦2,000
          </button>

          <button
            onClick={onBack}
            className="mt-3 w-full inline-flex items-center justify-center rounded-xl px-5 py-3 border border-white/20 hover:bg-white/5 transition-colors text-sm text-blue-200"
          >
            I'll pay later
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#091329] to-[#020617] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="rounded-3xl border border-blue-300/20 bg-gradient-to-r from-[#0b1735] to-[#102146] p-6 mb-5 shadow-2xl shadow-black/30">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200/75">Business Onboarding</p>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-2">SMEDAN x BigCat x CAC</h1>
          <p className="text-blue-100/80 mt-2 text-sm">
            Complete this quick business registration form to start onboarding.
          </p>
        </div>

        <form onSubmit={submitForm} className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7 space-y-4">
          {error && <div className="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">{error}</div>}

          <Field label="Business Name" icon={<Building2 className="w-4 h-4" />}>
            <input
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              placeholder="Enter business name"
              className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Business Category" icon={<Building2 className="w-4 h-4" />}>
            <div className="space-y-2">
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category} className="text-black">
                    {category}
                  </option>
                ))}
              </select>

              {showCustomCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="New category"
                    className="flex-1 rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="rounded-2xl px-4 py-3 bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                  >
                    Save
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowCustomCategoryInput((prev) => !prev)}
                className="inline-flex items-center gap-2 text-sm rounded-xl border border-blue-300/40 bg-blue-500/10 px-3 py-2 hover:bg-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                Add New Category
              </button>
            </div>
          </Field>

          <Field label="Date of Commencement" icon={<CalendarDays className="w-4 h-4" />}>
            <input
              type="date"
              value={form.date_of_commencement}
              onChange={(e) => updateField("date_of_commencement", e.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Owner Name" icon={<UserRound className="w-4 h-4" />}>
            <input
              value={form.owner_name}
              onChange={(e) => updateField("owner_name", e.target.value)}
              placeholder="Enter owner full name"
              className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Phone Number" icon={<Phone className="w-4 h-4" />}>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="08012345678"
              className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <Field label="Email" icon={<Mail className="w-4 h-4" />}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="owner@business.com"
              className="w-full rounded-2xl border border-white/20 bg-[#0a1228] px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>

          <button
            type="submit"
            disabled={loading || !canProceed}
            className="w-full rounded-2xl py-4 text-base font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Proceed
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-blue-100 flex items-center gap-2">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}
