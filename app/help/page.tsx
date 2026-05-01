'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Search, ShoppingBag, Store, CreditCard, Shield, Package, MessageSquare, Star, AlertCircle } from 'lucide-react'

const faqs: { category: string; icon: React.ReactNode; items: { q: string; a: string }[] }[] = [
  {
    category: 'Buying on BigCat',
    icon: <ShoppingBag className="w-5 h-5" />,
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse products or services on the marketplace, tap "Add to Cart" or "Book Now", then proceed to checkout. Choose your delivery address, payment method, and confirm your order.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept PalmPay wallet, bank transfer, and credit/debit card payments. All payments are protected by our escrow system.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes. Go to your Orders tab in the buyer dashboard. Each order shows its current status: Pending, Confirmed, Shipped, Delivered, or Completed.',
      },
      {
        q: 'What if I receive a wrong or damaged item?',
        a: 'Do NOT mark the order as delivered. Instead, open a dispute from the order details page within 48 hours of delivery. Our support team will investigate and resolve it. Funds are automatically released to the merchant only after you mark the order as delivered.',
      },
      {
        q: 'How do I cancel an order?',
        a: 'You cannot cancel an order after it has been placed. Once placed, your order moves through the fulfillment process. If you have a problem with an order, file a dispute from the order details page.',
      },
    ],
  },
  {
    category: 'Payments & Escrow',
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      {
        q: 'How does escrow work?',
        a: 'When you pay, your money is held securely in escrow. To release the funds to the merchant, you must mark the order as "Delivered" in your orders list after you have received it. Funds are automatically released to the merchant once you mark it as delivered. If you do not mark it as delivered, funds are auto-released after 48 hours.',
      },
      {
        q: 'When should I mark my order as delivered?',
        a: 'Mark your order as delivered only after you have received it and are satisfied with it. Once marked as delivered, the transaction is final and funds are released to the merchant.',
      },
      {
        q: 'What is VAT on BigCat?',
        a: 'BigCat charges 7.5% VAT on all goods and services in compliance with Nigeria\'s Finance Act 2019. VAT is calculated on the product or service price (not delivery fees) and is shown in your price breakdown at checkout.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Refunds for disputes resolved in your favour are processed within 3–5 business days back to your original payment method or PalmPay wallet.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. BigCat does not store your card or bank details. All transactions are processed through PalmPay\'s secure payment infrastructure.',
      },
    ],
  },
  {
    category: 'Selling on BigCat',
    icon: <Store className="w-5 h-5" />,
    items: [
      {
        q: 'How do I become a merchant?',
        a: 'Sign up as a merchant, complete the onboarding form, and submit your business details including CAC registration and SMEDAN ID. Our team reviews applications within 1–3 business days.',
      },
      {
        q: 'What documents do I need to register?',
        a: 'You need a valid government-issued ID, your CAC Business Name or Company registration certificate, and a SMEDAN ID (for SMEs). These are required for merchant verification.',
      },
      {
        q: 'How do I get paid for my sales?',
        a: 'Once a buyer marks an order as delivered or escrow is auto-released (after 48 hours), the amount (minus platform fees) is credited to your merchant wallet. You can withdraw your wallet funds to your registered bank account anytime. Minimum withdrawal is ₦1,000 with a 2.5% processing fee. Use the "Withdraw" button in your merchant dashboard to initiate a withdrawal.',
      },
      {
        q: 'What are merchant tokens?',
        a: 'Merchant tokens are credits that power your store\'s activity on the platform. Each order charges a small number of tokens. Tokens can be topped up from your merchant dashboard.',
      },
      {
        q: 'Can I offer both products and services?',
        a: 'Yes. BigCat supports both physical/digital product listings and service bookings. You can manage both from your merchant dashboard.',
      },
    ],
  },
  {
    category: 'Disputes & Safety',
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        q: 'How do I file a dispute?',
        a: 'Go to the affected order in your dashboard, tap "Report Issue", describe the problem, and submit. Our support team will review the case and contact both parties.',
      },
      {
        q: 'What happens during a dispute?',
        a: 'When you file a dispute, escrow funds are immediately frozen and cannot be released until the dispute is resolved. You cannot mark an order as delivered while a dispute is active. BigCat admin reviews the evidence and makes a decision, typically within 5–7 business days. Once resolved, funds are either refunded to the buyer or released to the merchant based on the admin decision.',
      },
      {
        q: 'What is the strike system?',
        a: 'Users who repeatedly violate platform policies receive strikes. After 3 strikes, an account may be suspended. Violations include contact-sharing, fraud, and policy abuse.',
      },
      {
        q: 'How does BigCat prevent fraud?',
        a: 'BigCat uses escrow payments, identity verification for merchants, AI-powered chat monitoring for contact bypass attempts, and a trust & safety system with automated flagging.',
      },
    ],
  },
  {
    category: 'Delivery & Logistics',
    icon: <Package className="w-5 h-5" />,
    items: [
      {
        q: 'How is delivery fee calculated?',
        a: 'Delivery fees are based on the weight of your order and your delivery location (state). Express delivery costs more than standard delivery. Fees are shown at checkout before you pay.',
      },
      {
        q: 'What is the difference between delivery and pickup?',
        a: 'Delivery means the merchant ships to your address. Pickup means you collect from a merchant-specified location or a logistics pickup point — this can be cheaper.',
      },
      {
        q: 'Can I change my delivery address after ordering?',
          a: 'No. Buyers cannot change the delivery address after placing an order. Make sure your address is correct before checkout.',
      },
    ],
  },
  {
    category: 'Account & Settings',
    icon: <Star className="w-5 h-5" />,
    items: [
      {
        q: 'How do I reset my password?',
        a: 'On the login screen, tap "Forgot Password" and enter your registered email. You will receive an OTP or reset link within a few minutes.',
      },
      {
        q: 'Can I have both a buyer and merchant account?',
        a: 'Yes, you can have both a buyer account and a merchant account, but they require separate email addresses. You can create both using different emails under the same person\'s name or business.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Settings → Account → Delete Account. Note that deleting your account will cancel all pending orders and forfeit any unclaimed wallet balance. This action is irreversible.',
      },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? faqs.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(query.toLowerCase()) ||
            item.a.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter((cat) => cat.items.length > 0)
    : faqs

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Help Center</h1>
          <p className="text-white/80 text-sm mb-6">Find answers to common questions about BigCat Marketplace</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-white text-foreground text-sm outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No results found for &ldquo;{query}&rdquo;. Try different keywords or{' '}
            <Link href="/contact" className="text-primary underline">contact us</Link>.
          </div>
        )}
        {filtered.map((cat) => (
          <div key={cat.category} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-border bg-secondary/30">
              <span className="text-primary">{cat.icon}</span>
              <h2 className="font-semibold text-foreground text-sm">{cat.category}</h2>
            </div>
            <div className="px-4">
              {cat.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
          <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground mb-1">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">Our support team is available Monday – Saturday, 8am – 8pm WAT.</p>
          <Link
            href="/contact"
            className="inline-block bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </Link>
        </div>

        <div className="text-center text-xs text-muted-foreground pb-6 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to BigCat</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
