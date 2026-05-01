"use client"

import { useEffect, useState } from 'react'
import { Loader2, Plus, Wrench } from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'

const SERVICE_CATEGORY_OPTIONS = [
  'Cleaning',
  'Repairs',
  'Beauty',
  'Home Services',
  'Tech Support',
  'Event Services',
  'Health & Wellness',
  'Tutoring',
  'Moving & Delivery',
  'Other',
]

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function statusClass(status: string) {
  const key = String(status || '').toLowerCase()
  if (key === 'completed' || key === 'released') return 'bg-primary/10 text-primary'
  if (key === 'disputed' || key === 'cancelled') return 'bg-destructive/10 text-destructive'
  return 'bg-secondary text-foreground'
}

export function MerchantServices({ merchantId }: { merchantId: string }) {
  const [services, setServices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    basePrice: '',
    workingDays: [] as string[],
    workingHours: '',
    serviceCity: '',
    serviceState: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [servicesResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/services?merchantId=${merchantId}`),
        fetch(`/api/service-bookings?merchantId=${merchantId}`),
      ])

      const servicesResult = await servicesResponse.json()
      const bookingsResult = await bookingsResponse.json()

      if (servicesResult.success && Array.isArray(servicesResult.data)) {
        setServices(servicesResult.data)
      }

      if (bookingsResult.success && Array.isArray(bookingsResult.data)) {
        setBookings(bookingsResult.data)
      }

      if (!servicesResult.success) {
        setError(servicesResult.error || 'Failed to load services')
      } else {
        setError('')
      }
    } catch (err) {
      console.error('Load merchant services failed:', err)
      setError('Unable to load service data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!merchantId) return
    loadData()
  }, [merchantId])

  const createListing = async () => {
    if (!form.title.trim()) {
      setError('Service title is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          title: form.title,
          description: form.description,
          category: form.category,
          basePrice: Number(form.basePrice || 0),
          workingDays: form.workingDays,
          workingHours: form.workingHours,
          serviceCity: form.serviceCity,
          serviceState: form.serviceState,
        }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Failed to create service listing')
        return
      }

      setForm({
        title: '',
        description: '',
        category: '',
        basePrice: '',
        workingDays: [],
        workingHours: '',
        serviceCity: '',
        serviceState: '',
      })
      setError('')
      await loadData()
    } catch (err) {
      console.error('Create listing failed:', err)
      setError('Unable to create service listing')
    } finally {
      setSaving(false)
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch('/api/service-bookings/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status,
          actorId: merchantId,
          actorType: 'merchant',
        }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Failed to update booking status')
        return
      }

      await loadData()
    } catch (err) {
      console.error('Update booking status failed:', err)
      setError('Unable to update booking status')
    }
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Services</h2>
          <p className="text-sm text-muted-foreground">Create and manage service listings and bookings.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Wrench className="w-5 h-5" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Add New Service</h3>
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">Fill each box with the suggested content below.</p>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Service title: short clear name of the service. Example: Home Plumbing Repair.</p>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Service title"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Description: what the customer will get, what is included, and any limits.</p>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what is included"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Category: type of service. Example: Cleaning, Repairs, Beauty.</p>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {SERVICE_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Base price: starting fee in naira (numbers only).</p>
            <input
              value={form.basePrice}
              onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
              placeholder="Base price"
              type="number"
              min={0}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">City: city where you can deliver this service.</p>
            <input
              value={form.serviceCity}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceCity: e.target.value }))}
              placeholder="City"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground">State: state where this service is available. Example: Lagos.</p>
            <input
              value={form.serviceState}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceState: e.target.value }))}
              placeholder="State"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground">Working days: pick the days customers can book you.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-border bg-background p-3">
              {WEEK_DAYS.map((day) => {
                const checked = form.workingDays.includes(day)
                return (
                  <label key={day} className="inline-flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm((prev) => ({
                          ...prev,
                          workingDays: checked
                            ? prev.workingDays.filter((d) => d !== day)
                            : [...prev.workingDays, day],
                        }))
                      }}
                    />
                    {day}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground">Working hours: write your available time range. Example: 8:00 AM - 6:00 PM.</p>
            <input
              value={form.workingHours}
              onChange={(e) => setForm((prev) => ({ ...prev, workingHours: e.target.value }))}
              placeholder="8:00 AM - 6:00 PM"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={createListing}
          disabled={saving}
          className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Creating...' : 'Create Service Listing'}
        </button>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Your Service Listings</h3>
        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            You have not added services yet.
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{service.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{service.category || 'General'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(service.working_days) && service.working_days.length > 0
                        ? `Days: ${service.working_days.join(', ')}`
                        : 'Days: Not set'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Hours: {service.working_hours || 'Not set'}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatNaira(Number(service.base_price || 0))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2">Incoming Service Bookings</h3>
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{booking.service?.title || 'Service booking'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Buyer: {booking.buyer_name || 'Buyer'}</p>
                    <p className="text-xs text-muted-foreground">Address: {booking.service_address || 'Not provided'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatNaira(Number(booking.quoted_price || 0))}</p>
                    <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-[11px] font-medium ${statusClass(booking.status)}`}>
                      {String(booking.status || 'requested').replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {booking.status === 'requested' && (
                    <button onClick={() => updateBookingStatus(booking.id, 'accepted')} className="rounded-lg bg-primary text-primary-foreground py-2 text-xs font-medium">Accept</button>
                  )}
                  {(booking.status === 'accepted' || booking.status === 'requested') && (
                    <button onClick={() => updateBookingStatus(booking.id, 'scheduled')} className="rounded-lg bg-secondary text-foreground py-2 text-xs font-medium">Mark Scheduled</button>
                  )}
                  {(booking.status === 'scheduled' || booking.status === 'accepted') && (
                    <button onClick={() => updateBookingStatus(booking.id, 'in_progress')} className="rounded-lg bg-secondary text-foreground py-2 text-xs font-medium">Start Job</button>
                  )}
                  {booking.status === 'in_progress' && (
                    <button onClick={() => updateBookingStatus(booking.id, 'completed')} className="rounded-lg bg-primary text-primary-foreground py-2 text-xs font-medium">Mark Completed</button>
                  )}
                  {!['completed', 'released', 'disputed', 'cancelled'].includes(String(booking.status || '').toLowerCase()) && (
                    <button onClick={() => updateBookingStatus(booking.id, 'cancelled')} className="rounded-lg bg-destructive/10 text-destructive py-2 text-xs font-medium">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
