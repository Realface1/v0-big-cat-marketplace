import Link from 'next/link'
import { Scale } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service – BigCat Marketplace',
}

const EFFECTIVE_DATE = 'April 29, 2026'
const COMPANY = 'BigCat Marketplace'
const EMAIL = 'legal@bigcat.ng'
const SUPPORT_EMAIL = 'support@bigcat.ng'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
          <p className="text-white/80 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-8 text-sm text-foreground leading-relaxed">

          <section>
            <p className="text-muted-foreground">
              Welcome to {COMPANY}. By accessing or using our platform (website, mobile app, or any related services), you agree to be bound by these Terms of Service. Please read them carefully before using our services.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">1. About BigCat Marketplace</h2>
            <p className="text-muted-foreground">
              {COMPANY} is a Nigerian e-commerce marketplace that connects buyers and sellers of goods and services. We provide the platform, payment infrastructure, escrow protection, and related tools. We are not a party to transactions between buyers and merchants, but we facilitate and protect them through our escrow system.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">2. Eligibility</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>You must be at least 18 years old to use this platform.</li>
              <li>You must provide accurate and truthful information when creating an account.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>Merchants must hold valid business registration (CAC) and SMEDAN verification where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">3. Buyer Obligations</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Buyers must provide an accurate delivery address and contact information.</li>
              <li>Buyers must only release escrow funds when they have received their order in satisfactory condition.</li>
              <li>Buyers must raise any disputes within 48 hours of delivery.</li>
              <li>Buyers must not attempt to defraud merchants through false dispute claims.</li>
              <li>Buyers must keep all communication on the platform — sharing contact details to bypass the platform is prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">4. Merchant Obligations</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Merchants must list only goods and services they are authorised to sell.</li>
              <li>Product descriptions, images, and prices must be accurate and not misleading.</li>
              <li>Merchants must fulfil orders in a timely manner and ship within the stated timeframe.</li>
              <li>Merchants must not list counterfeit, prohibited, or illegal items.</li>
              <li>Merchants must respond to buyer messages and disputes promptly.</li>
              <li>Merchants are responsible for maintaining sufficient merchant tokens to receive orders.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">5. Payments, VAT & Escrow</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>All payments are processed through PalmPay&rsquo;s secure infrastructure.</li>
              <li>Funds are held in escrow until the buyer confirms receipt and releases payment.</li>
              <li>VAT at 7.5% (as mandated by Nigeria&rsquo;s Finance Act 2019) is applied to all goods and services at checkout. VAT is not charged on delivery fees.</li>
              <li>Escrow funds are auto-released to the merchant after 7 days if the buyer does not confirm or dispute.</li>
              <li>Platform fees are deducted from merchant payouts before credit to the merchant wallet.</li>
              <li>Refunds for resolved disputes are processed within 3–5 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">6. Prohibited Conduct</h2>
            <p className="text-muted-foreground mb-2">The following are strictly prohibited on {COMPANY}:</p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Sharing phone numbers, emails, or social media handles to conduct transactions outside the platform.</li>
              <li>Listing counterfeit, stolen, or prohibited goods.</li>
              <li>Creating fake reviews or manipulating ratings.</li>
              <li>Filing false disputes or chargebacks.</li>
              <li>Impersonating another user, merchant, or BigCat staff.</li>
              <li>Using bots, scripts, or automated tools to interact with the platform.</li>
              <li>Any form of money laundering or fraudulent activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">7. Strike System & Suspensions</h2>
            <p className="text-muted-foreground">
              Users who violate platform policies receive strikes. Upon accumulating 3 strikes, an account may be temporarily or permanently suspended. BigCat reserves the right to suspend any account immediately if serious fraud or safety violations are detected, without prior notice.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">8. Dispute Resolution</h2>
            <p className="text-muted-foreground">
              Disputes between buyers and merchants should first be attempted through direct in-app chat. If unresolved, either party may escalate via the &ldquo;Report Issue&rdquo; function. BigCat&rsquo;s support team will investigate and issue a binding decision within 5–7 business days. BigCat&rsquo;s decisions on disputes are final within the platform.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">9. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on the platform — including the BigCat name, logo, interface design, and software — is the property of {COMPANY} and is protected by Nigerian and international intellectual property laws. Merchants grant BigCat a non-exclusive licence to display their product images and descriptions on the platform for the purpose of facilitating sales.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              {COMPANY} is not liable for the quality, safety, legality, or availability of products or services listed by merchants. Our total liability to any user for any claim arising from use of the platform shall not exceed the value of the specific transaction in dispute. We are not liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms that cannot be resolved through our internal process shall be submitted to the appropriate courts in Lagos State, Nigeria.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">12. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of the platform after changes take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3">13. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at{' '}
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
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
