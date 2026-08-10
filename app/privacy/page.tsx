import Link from 'next/link'
import { Lock } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy – BigCat Marketplace',
}

const EFFECTIVE_DATE = 'April 29, 2026'
const COMPANY = 'BigCat Marketplace'
const EMAIL = 'privacy@bigcat.ng'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-white/80 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-8 text-sm text-foreground leading-relaxed">

          <section>
            <p className="text-muted-foreground">
              {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, share, and protect your data when you use our platform. We comply with the Nigeria Data Protection Regulation (NDPR) 2019 issued by the National Information Technology Development Agency (NITDA).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-2">We collect the following categories of information:</p>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">Account Information</p>
                <p className="text-muted-foreground">Name, email address, phone number, profile photo, and password (stored as a hash).</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Merchant Information</p>
                <p className="text-muted-foreground">Business name, CAC registration number, SMEDAN ID, business address, bank account details (for payouts), and product/service listings.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Transaction Information</p>
                <p className="text-muted-foreground">Order history, payment records, escrow transactions, delivery addresses, and dispute history.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Usage Information</p>
                <p className="text-muted-foreground">Pages visited, search queries, features used, device type, browser type, IP address, and timestamps.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Communications</p>
                <p className="text-muted-foreground">Messages sent through the in-app chat system, support tickets, and any correspondence with our team.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">2. How We Use Your Information</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>To create and manage your account.</li>
              <li>To process orders, payments, and escrow transactions.</li>
              <li>To connect buyers and merchants and facilitate transactions.</li>
              <li>To verify merchant identity and business registration.</li>
              <li>To send order updates, support responses, and important notices.</li>
              <li>To detect fraud, enforce our policies, and maintain platform safety.</li>
              <li>To improve our platform through usage analytics.</li>
              <li>To comply with legal obligations including FIRS tax reporting requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">3. Legal Basis for Processing (NDPR)</h2>
            <p className="text-muted-foreground mb-2">Under the NDPR, we process your data on the following lawful bases:</p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Contract performance</strong> — to fulfil our service to you (processing orders, managing accounts).</li>
              <li><strong className="text-foreground">Legitimate interest</strong> — fraud prevention, platform security, and service improvement.</li>
              <li><strong className="text-foreground">Legal obligation</strong> — tax reporting, regulatory compliance, and responding to lawful requests from authorities.</li>
              <li><strong className="text-foreground">Consent</strong> — for marketing communications. You can withdraw consent at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">4. Sharing Your Information</h2>
            <p className="text-muted-foreground mb-2">We do not sell your personal data. We share it only in these circumstances:</p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">With merchants</strong> — your delivery address and contact name are shared with the merchant fulfilling your order.</li>
              <li><strong className="text-foreground">With buyers</strong> — your store name, description, and listing information are publicly visible on your merchant profile.</li>
              <li><strong className="text-foreground">Payment processors</strong> — PalmPay processes payments and receives necessary transaction data.</li>
              <li><strong className="text-foreground">Regulatory bodies</strong> — FIRS, SMEDAN, CAC, or other Nigerian government agencies when legally required.</li>
              <li><strong className="text-foreground">Service providers</strong> — hosting (Vercel/Supabase), email delivery, and analytics tools, all under strict data processing agreements.</li>
              <li><strong className="text-foreground">Law enforcement</strong> — when required by a valid court order or law enforcement request.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account data for as long as your account is active. Transaction records are kept for a minimum of 6 years to comply with Nigerian tax and financial regulations. You may request deletion of your account and non-essential personal data at any time (see Section 7).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">6. Data Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures including encrypted data storage, TLS encryption for data in transit, and strict access controls. Passwords are hashed and never stored in plain text. However, no system is 100% secure — please use a strong, unique password and keep it confidential.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">7. Your Rights (NDPR)</h2>
            <p className="text-muted-foreground mb-2">Under the NDPR, you have the right to:</p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong className="text-foreground">Rectification</strong> — request correction of inaccurate or outdated information.</li>
              <li><strong className="text-foreground">Erasure</strong> — request deletion of your personal data (subject to legal retention obligations).</li>
              <li><strong className="text-foreground">Restriction</strong> — request that we limit how we use your data while a dispute is being resolved.</li>
              <li><strong className="text-foreground">Portability</strong> — request your data in a machine-readable format.</li>
              <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interest, including profiling.</li>
              <li><strong className="text-foreground">Withdraw consent</strong> — opt out of marketing communications at any time.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these rights, email <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">8. Cookies & Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies to maintain your session, remember your preferences, and understand how the platform is used. You can control cookie settings through your browser. Disabling certain cookies may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">9. Children&rsquo;s Privacy</h2>
            <p className="text-muted-foreground">
              {COMPANY} is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before changes take effect. Your continued use of the platform after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">11. Contact Our Data Protection Officer</h2>
            <p className="text-muted-foreground">
              For privacy-related requests or concerns, contact our Data Protection Officer at{' '}
              <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a> or visit our{' '}
              <Link href="/contact" className="text-primary underline">Contact page</Link>.
            </p>
          </section>

        </div>

        <div className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to BigCat</Link>
          <span>·</span>
          <Link href="/help" className="hover:text-foreground transition-colors">Help Center</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
