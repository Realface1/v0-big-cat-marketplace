"use client"

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, FileText, Loader2, MapPin, MessageCircle, Search, Wallet, Wrench, X } from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'
import { getUserStrikeCount, isUserSuspended, resetSafetyState, syncSafetyStateFromServer } from '@/lib/trust-safety'

export function ServicesMarketplace({
  buyerId,
  onBack,
  onChatMerchant,
  onNeedsAuth,
  onProceedToCheckout,
}: {
  buyerId: string
  onBack: () => void
  onChatMerchant?: (conversation?: any) => void
  onNeedsAuth?: () => void
  onProceedToCheckout?: (bill: any) => void
}) {
  const [services, setServices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [viewService, setViewService] = useState<any | null>(null)
  const [suspended, setSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'browse' | 'jobs' | 'bills'>('browse')

  const syncSuspensionFromServer = async () => {
    try {
      const response = await fetch(`/api/safety/status?userId=${encodeURIComponent(buyerId)}`)
      const result = await response.json()
      if (result.success) {
        syncSafetyStateFromServer(buyerId, { strikes: Number(result.strikes || 0), suspended: Boolean(result.suspended), remainingMs: Number(result.remainingMs || 0) })
        setSuspended(Boolean(result.suspended))
        setStrikeCount(Number(result.strikes || 0))
        return
      }
    } catch {}
    setSuspended(isUserSuspended(buyerId))
    setStrikeCount(getUserStrikeCount(buyerId))
  }

  const guardSuspendedAction = () => {
    if (!suspended) return false
    setError('Your account has been temporarily suspended for violating platform policies.')
    return true
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    services.forEach((s) => { if (s?.category) set.add(String(s.category)) })
    return Array.from(set)
  }, [services])

  const loadServices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('search', query.trim())
      if (category) params.set('category', category)
      const response = await fetch(`/api/services?${params.toString()}`)
      const result = await response.json()
      setServices(result.success && Array.isArray(result.data) ? result.data : [])
      if (!result.success) setError(result.error || 'Failed to fetch services')
      else setError('')
    } catch {
      setError('Unable to load services')
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      const response = await fetch(`/api/service-bookings?buyerId=${buyerId}`)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) setBookings(result.data)
    } catch {}
  }

  const loadBills = async () => {
    if (buyerId === 'guest') return
    try {
      const response = await fetch(`/api/service-bills?buyerId=${encodeURIComponent(buyerId)}`)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) setBills(result.data)
    } catch {}
  }

  useEffect(() => { loadServices() }, [category])
  useEffect(() => { loadBookings(); loadBills() }, [buyerId])
  useEffect(() => { syncSuspensionFromServer() }, [buyerId])

  const startChatWithMerchant = async (service: any) => {
    if (buyerId === 'guest') { onNeedsAuth?.(); return }
    if (guardSuspendedAction()) return
    const merchantId = String(service?.merchant_id || '').trim()
    if (!merchantId) { setError('Merchant is not available for chat'); return }
    try {
      const response = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId, merchantId }),
      })
      const result = await response.json()
      if (!result.success) { setError(result.error || 'Unable to start chat'); return }
      onChatMerchant?.({
        id: result.data?.id,
        vendorId: merchantId,
        vendorName: service.merchant_name || 'Merchant',
        vendorLocation: service.service_city || service.service_state || 'Nigeria',
        vendorRating: 5,
        lastMessage: `Hi, I\u2019m interested in your "${service.title}" service. Can we discuss the details?`,
        timestamp: new Date(),
        unread: 0,
        avatar: String(service.merchant_name || 'M').charAt(0).toUpperCase(),
      })
    } catch {
      setError('Unable to start chat with merchant')
    }
  }

  const proceedToBillCheckout = (bill: any) => {
    if (buyerId === 'guest') {
      onNeedsAuth?.()
      return
    }
    if (guardSuspendedAction()) return

    if (!onProceedToCheckout) {
      setError('Checkout is not available right now. Please try again.')
      return
    }

    onProceedToCheckout(bill)
  }

  const updateBooking = async (bookingId: string, status: 'released' | 'disputed') => {
    if (guardSuspendedAction()) return
    try {
      const response = await fetch('/api/service-bookings/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status, actorId: buyerId, actorType: 'buyer' }),
      })
      const result = await response.json()
      if (!result.success) { setError(result.error || 'Failed to update'); return }
      await loadBookings()
    } catch {
      setError('Unable to update booking')
    }
  }

  const pendingBills = bills.filter((b) => b.status === 'sent')
  const paidBills = bills.filter((b) => b.status === 'paid')

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-lg font-bold text-foreground">Services</h2>
        <div className="w-10" />
      </div>

      <div className="flex gap-1 bg-secondary/60 rounded-xl p-1">
        {(['browse', 'jobs', 'bills'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {tab === 'browse' ? 'Browse' : tab === 'jobs' ? `My Jobs${bookings.length > 0 ? ` (${bookings.length})` : ''}` : `Bills${pendingBills.length > 0 ? ` (${pendingBills.length})` : ''}`}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4 shrink-0" /></button>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
            <MessageCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">How it works:</span> Browse services → Chat the provider → Agree on price → Provider sends you a bill → Pay securely through BigCat.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadServices()} placeholder="Search services..." className="w-full bg-transparent text-sm outline-none" />
              <button onClick={loadServices} className="text-xs text-primary font-medium">Search</button>
            </div>
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-auto pb-0.5">
                <button onClick={() => setCategory('')} className={`px-3 py-1.5 text-xs rounded-full border shrink-0 ${!category ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>All</button>
                {categories.map((item) => (
                  <button key={item} onClick={() => setCategory(item)} className={`px-3 py-1.5 text-xs rounded-full border shrink-0 ${category === item ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>{item}</button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Wrench className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No services available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <button key={service.id} onClick={() => setViewService(service)} className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{service.title}</p>
                        {service.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">{service.category}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description || 'No description provided'}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground font-medium">
                        <span>{service.merchant_name || 'Merchant'}</span>
                        {(service.service_city || service.service_state) && (
                          <><span className="text-border">•</span><MapPin className="w-3 h-3" /><span>{[service.service_city, service.service_state].filter(Boolean).join(', ')}</span></>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Active and completed service jobs you have paid for.</p>
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Wrench className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No active jobs yet. Pay a bill to get started.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{booking.service?.title || 'Service job'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Provider: {booking.merchant_name || 'Merchant'}</p>
                    {booking.service_address && <p className="text-xs text-muted-foreground">Location: {booking.service_address}</p>}
                    {booking.scheduled_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.scheduled_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatNaira(Number(booking.quoted_price || 0))}</p>
                    <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                      booking.status === 'released' ? 'bg-primary/10 text-primary' :
                      booking.status === 'completed' ? 'bg-amber-100 text-amber-700' :
                      booking.status === 'cancelled' || booking.status === 'disputed' ? 'bg-destructive/10 text-destructive' :
                      booking.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-secondary text-foreground'
                    }`}>{String(booking.status || 'accepted').replace(/_/g, ' ')}</span>
                  </div>
                </div>
                {booking.status === 'completed' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={() => updateBooking(booking.id, 'released')} className="rounded-lg bg-primary text-primary-foreground py-2 text-xs font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Release
                    </button>
                    <button onClick={() => updateBooking(booking.id, 'disputed')} className="rounded-lg bg-destructive/10 text-destructive py-2 text-xs font-medium">Report Issue</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No bills yet. Chat a service provider to get a quote.</p>
            </div>
          ) : (
            <>
              {pendingBills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Pending Payment</p>
                  {pendingBills.map((bill) => (
                    <div key={bill.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{bill.scope_summary || 'Service bill'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">From: {bill.merchant_name || 'Merchant'}</p>
                          {bill.timeline && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{bill.timeline}</p>}
                          {Array.isArray(bill.line_items) && bill.line_items.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {bill.line_items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{item.description}{item.quantity > 1 ? ` \u00d7${item.quantity}` : ''}</span>
                                  <span>{formatNaira(Number(item.unit_price) * Number(item.quantity || 1))}</span>
                                </div>
                              ))}
                              {Number(bill.discount_amount) > 0 && (
                                <div className="flex items-center justify-between text-xs text-primary font-medium">
                                  <span>Discount</span><span>-{formatNaira(Number(bill.discount_amount))}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {bill.notes && <p className="text-xs text-muted-foreground italic mt-1">"{bill.notes}"</p>}
                          {bill.valid_until && <p className="text-xs text-amber-600 mt-1">Expires: {new Date(bill.valid_until).toLocaleDateString('en-NG')}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-foreground">{formatNaira(Number(bill.total_amount))}</p>
                          <span className="text-[10px] text-primary font-medium">Total</span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => proceedToBillCheckout(bill)} className="rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold flex items-center justify-center gap-1.5">
                          <Wallet className="w-4 h-4" />Pay Now
                        </button>
                        <button onClick={async () => { await fetch('/api/service-bills', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', billId: bill.id, actorId: buyerId, actorType: 'buyer' }) }); await loadBills() }} className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive py-2 text-sm font-medium">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {paidBills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Paid Bills</p>
                  {paidBills.map((bill) => (
                    <div key={bill.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{bill.scope_summary || 'Service bill'}</p>
                          <p className="text-xs text-muted-foreground">From: {bill.merchant_name || 'Merchant'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(bill.created_at).toLocaleDateString('en-NG')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{formatNaira(Number(bill.total_amount))}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Paid</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {viewService && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">{viewService.title}</p>
                  {viewService.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{viewService.category}</span>}
                </div>
              </div>
              <button onClick={() => setViewService(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 pb-5 space-y-4">
              {viewService.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About This Service</p>
                  <p className="text-sm text-foreground leading-relaxed">{viewService.description}</p>
                </div>
              )}
              <div className="rounded-xl bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground text-xs font-semibold">Provider</span>
                  <span className="font-medium text-foreground">{viewService.merchant_name || 'Merchant'}</span>
                </div>
                {(viewService.service_city || viewService.service_state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground text-xs font-semibold">Location</span>
                    <span className="flex items-center gap-1 text-foreground"><MapPin className="w-3 h-3 text-primary" />{[viewService.service_city, viewService.service_state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {Array.isArray(viewService.working_days) && viewService.working_days.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground text-xs font-semibold">Available</span>
                    <span className="text-foreground">{viewService.working_days.join(', ')}{viewService.working_hours ? ` \u00b7 ${viewService.working_hours}` : ''}</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold text-primary mb-0.5">Pricing by agreement</p>
                <p className="text-xs text-muted-foreground">Price is discussed directly with the provider. Once you agree, the provider will send you a bill to pay securely through BigCat.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => { setViewService(null); startChatWithMerchant(viewService) }} disabled={suspended} className="w-full rounded-xl bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  <MessageCircle className="w-4 h-4" /> Chat Provider
                </button>
                <button onClick={() => { setViewService(null); startChatWithMerchant(viewService) }} disabled={suspended} className="w-full rounded-xl border border-primary text-primary px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  Request Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {suspended && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mt-4">
          <p className="text-sm font-semibold text-red-700">Account Suspended</p>
          <p className="text-xs text-red-700 mt-1">Temporarily suspended for violating platform policies. Strikes: {strikeCount}</p>
          <button onClick={() => { resetSafetyState(buyerId); setSuspended(false); setStrikeCount(0); setError('') }} className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium">Reset Strikes (Demo)</button>
        </div>
      )}
    </div>
  )
}
