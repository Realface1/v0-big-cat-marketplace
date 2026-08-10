'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, Clock, MessageSquare, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
    const subjectEncoded = encodeURIComponent(subject || 'BigCat Support Request')
    window.location.href = `mailto:support@bigcat.ng?subject=${subjectEncoded}&body=${body}`
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
          <p className="text-white/80 text-sm">We&rsquo;re here to help. Reach out and we&rsquo;ll get back to you as soon as possible.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="mailto:support@bigcat.ng"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Email</p>
            <p className="text-xs text-muted-foreground mt-0.5">support@bigcat.ng</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reply within 24h</p>
          </a>

          <a
            href="https://wa.me/2348000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            <p className="text-xs text-muted-foreground mt-0.5">+234 800 000 0000</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mon–Sat, 8am–8pm</p>
          </a>

          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Support Hours</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mon – Sat</p>
            <p className="text-xs text-muted-foreground mt-0.5">8:00am – 8:00pm WAT</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold text-foreground text-sm">Send Us a Message</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill the form below — it will open your email app with the message ready to send.</p>
          </div>
          {submitted ? (
            <div className="p-8 flex flex-col items-center text-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-foreground">Your email app should have opened!</p>
              <p className="text-sm text-muted-foreground">If it didn&rsquo;t, email us directly at <a href="mailto:support@bigcat.ng" className="text-primary underline">support@bigcat.ng</a></p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-sm text-primary underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amaka Obi"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary transition-colors"
                >
                  <option value="">Select a topic…</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Payment or Refund">Payment or Refund</option>
                  <option value="Merchant Verification">Merchant Verification</option>
                  <option value="Account Access">Account Access</option>
                  <option value="Dispute Resolution">Dispute Resolution</option>
                  <option value="Report a User">Report a User</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail. Include your order number or username if relevant."
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground pb-6 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to BigCat</Link>
          <span>·</span>
          <Link href="/help" className="hover:text-foreground transition-colors">Help Center</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
