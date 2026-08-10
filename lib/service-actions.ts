'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications'

function toLower(value: unknown) {
  return String(value || '').toLowerCase().trim()
}

const VALID_BOOKING_STATUSES = new Set([
  'requested',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'released',
  'disputed',
  'cancelled',
])

async function attachMerchantNames(rows: any[]) {
  const supabase = await createClient()
  const merchantIds = Array.from(new Set(rows.map((row) => String(row?.merchant_id || '')).filter(Boolean)))
  if (merchantIds.length === 0) return rows

  const { data: merchants } = await supabase
    .from('auth_users')
    .select('id, business_name, name, full_name, email')
    .in('id', merchantIds)

  const map = new Map((merchants || []).map((merchant: any) => [String(merchant.id), merchant]))

  return rows.map((row) => {
    const merchant = map.get(String(row?.merchant_id || ''))
    return {
      ...row,
      merchant_name: merchant?.business_name || merchant?.name || merchant?.full_name || merchant?.email || 'Merchant',
    }
  })
}

export async function getMarketplaceServices(filters?: {
  search?: string
  category?: string
  state?: string
  city?: string
  merchantId?: string
}) {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('service_listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.state) query = query.ilike('service_state', `%${filters.state}%`)
    if (filters?.city) query = query.ilike('service_city', `%${filters.city}%`)
    if (filters?.merchantId) query = query.eq('merchant_id', filters.merchantId)

    const { data, error } = await query
    if (error) throw error

    let rows = data || []
    if (filters?.search) {
      const needle = filters.search.toLowerCase()
      rows = rows.filter((service: any) =>
        [service.title, service.description, service.category]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
    }

    const withNames = await attachMerchantNames(rows)
    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch services', data: [] }
  }
}

export async function getMerchantServices(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_listings')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch merchant services', data: [] }
  }
}

export async function createServiceListing(input: {
  merchantId: string
  title: string
  description?: string
  category?: string
  basePrice: number
  workingDays?: string[]
  workingHours?: string
  serviceCity?: string
  serviceState?: string
}) {
  try {
    const title = String(input.title || '').trim()
    if (!title) return { success: false, error: 'Title is required' }

    const basePrice = Number(input.basePrice || 0)
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { success: false, error: 'Base price must be valid' }
    }

    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_listings') as any)
      .insert({
        merchant_id: input.merchantId,
        title,
        description: String(input.description || '').trim() || null,
        category: String(input.category || '').trim() || null,
        base_price: Number(basePrice.toFixed(2)),
        duration_minutes: 60,
        working_days: Array.isArray(input.workingDays) ? input.workingDays : [],
        working_hours: String(input.workingHours || '').trim() || null,
        service_city: String(input.serviceCity || '').trim() || null,
        service_state: String(input.serviceState || '').trim() || null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    const message = String(error?.message || '')
    if (message.includes("Could not find the 'working_days' column") || message.includes("Could not find the 'working_hours' column")) {
      return {
        success: false,
        error:
          "Database schema is outdated. Run scripts/017-add-service-availability-fields.sql, then refresh PostgREST cache with: NOTIFY pgrst, 'reload schema';",
      }
    }

    return { success: false, error: error.message || 'Failed to create service listing' }
  }
}

export async function createServiceBooking(input: {
  serviceId: string
  buyerId: string
  scheduledAt?: string
  serviceAddress?: string
  buyerNote?: string
}) {
  try {
    const supabase = await createClient()
    const { data: service, error: serviceError } = await supabase
      .from('service_listings')
      .select('*')
      .eq('id', input.serviceId)
      .single()

    if (serviceError || !service) {
      return { success: false, error: 'Service not found' }
    }

    if (!service.is_active) {
      return { success: false, error: 'Service is not available' }
    }

    const { data, error } = await (supabase.from('service_bookings') as any)
      .insert({
        service_id: service.id,
        buyer_id: input.buyerId,
        merchant_id: service.merchant_id,
        status: 'requested',
        scheduled_at: input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null,
        service_address: String(input.serviceAddress || '').trim() || null,
        buyer_note: String(input.buyerNote || '').trim() || null,
        quoted_price: Number(service.base_price || 0),
        payment_status: 'held',
        escrow_status: 'held',
      })
      .select('*')
      .single()

    if (error) throw error

    await (supabase.from('service_booking_events') as any).insert({
      booking_id: data.id,
      actor_id: input.buyerId,
      actor_type: 'buyer',
      from_status: null,
      to_status: 'requested',
      note: 'Service booking created',
    })

    // Notify merchant of new booking
    const serviceTitle = String(service.title || 'a service')
    await dispatchNotification({
      userId: String(service.merchant_id),
      type: 'order',
      title: 'New service booking request',
      message: `You have a new booking request for "${serviceTitle}".`,
      eventKey: `service-booking-new:${data.id}`,
      metadata: { bookingId: data.id, serviceId: service.id, buyerId: input.buyerId },
    }).catch(() => null)

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create booking' }
  }
}

export async function getBuyerServiceBookings(buyerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const serviceIds = Array.from(new Set((data || []).map((row: any) => String(row.service_id)).filter(Boolean)))
    const { data: services } = serviceIds.length > 0
      ? await supabase.from('service_listings').select('*').in('id', serviceIds)
      : { data: [] as any[] }

    const serviceMap = new Map((services || []).map((row: any) => [String(row.id), row]))
    const withService = (data || []).map((booking: any) => ({
      ...booking,
      service: serviceMap.get(String(booking.service_id)) || null,
    }))

    const withNames = await attachMerchantNames(withService)
    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch buyer bookings', data: [] }
  }
}

export async function getMerchantServiceBookings(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const serviceIds = Array.from(new Set((data || []).map((row: any) => String(row.service_id)).filter(Boolean)))
    const { data: services } = serviceIds.length > 0
      ? await supabase.from('service_listings').select('*').in('id', serviceIds)
      : { data: [] as any[] }

    const buyerIds = Array.from(new Set((data || []).map((row: any) => String(row.buyer_id)).filter(Boolean)))
    const { data: buyers } = buyerIds.length > 0
      ? await supabase.from('auth_users').select('id, name, full_name, email').in('id', buyerIds)
      : { data: [] as any[] }

    const serviceMap = new Map((services || []).map((row: any) => [String(row.id), row]))
    const buyerMap = new Map((buyers || []).map((row: any) => [String(row.id), row]))

    const rows = (data || []).map((booking: any) => {
      const buyer = buyerMap.get(String(booking.buyer_id))
      return {
        ...booking,
        service: serviceMap.get(String(booking.service_id)) || null,
        buyer_name: buyer?.name || buyer?.full_name || buyer?.email || 'Buyer',
      }
    })

    return { success: true, data: rows }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch merchant bookings', data: [] }
  }
}

export async function updateServiceBookingStatus(input: {
  bookingId: string
  nextStatus: string
  actorId: string
  actorType: 'buyer' | 'merchant'
  note?: string
}) {
  try {
    const nextStatus = toLower(input.nextStatus)
    if (!VALID_BOOKING_STATUSES.has(nextStatus)) {
      return { success: false, error: 'Invalid status' }
    }

    const supabase = await createClient()
    const { data: booking, error: bookingError } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('id', input.bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Booking not found' }
    }

    if (input.actorType === 'merchant' && String(booking.merchant_id) !== String(input.actorId)) {
      return { success: false, error: 'Not allowed to update this booking' }
    }

    if (input.actorType === 'buyer' && String(booking.buyer_id) !== String(input.actorId)) {
      return { success: false, error: 'Not allowed to update this booking' }
    }

    const currentStatus = toLower(booking.status)

    const merchantAllowed = ['accepted', 'scheduled', 'in_progress', 'completed', 'cancelled']
    const buyerAllowed = ['released', 'disputed', 'cancelled']

    if (input.actorType === 'merchant' && !merchantAllowed.includes(nextStatus)) {
      return { success: false, error: 'Merchant cannot set this status' }
    }

    if (input.actorType === 'buyer' && !buyerAllowed.includes(nextStatus)) {
      return { success: false, error: 'Buyer cannot set this status' }
    }

    const updatePayload: any = { status: nextStatus }

    if (nextStatus === 'released') {
      updatePayload.payment_status = 'released'
      updatePayload.escrow_status = 'released'
    }

    if (nextStatus === 'disputed') {
      updatePayload.payment_status = 'held'
      updatePayload.escrow_status = 'held'
    }

    const { data, error } = await (supabase.from('service_bookings') as any)
      .update(updatePayload)
      .eq('id', input.bookingId)
      .select('*')
      .single()

    if (error) throw error

    await (supabase.from('service_booking_events') as any).insert({
      booking_id: input.bookingId,
      actor_id: input.actorId,
      actor_type: input.actorType,
      from_status: currentStatus,
      to_status: nextStatus,
      note: String(input.note || '').trim() || null,
    })

    // Send notifications based on status change
    const serviceName = String(data?.service_id || '')
    const notifyUserId = input.actorType === 'merchant' ? String(booking.buyer_id) : String(booking.merchant_id)
    const notifyMessages: Record<string, { title: string; message: string }> = {
      accepted: { title: 'Booking accepted', message: 'Your service booking has been accepted by the provider.' },
      scheduled: { title: 'Booking scheduled', message: 'Your service booking has been scheduled. The provider will be with you soon.' },
      in_progress: { title: 'Service in progress', message: 'The service provider has started work on your booking.' },
      completed: { title: 'Service completed — please confirm', message: 'Your service is complete. Please open your bookings and release the funds once you are satisfied.' },
      cancelled: { title: 'Booking cancelled', message: 'A service booking has been cancelled.' },
    }
    if (notifyMessages[nextStatus]) {
      await dispatchNotification({
        userId: notifyUserId,
        type: 'order',
        title: notifyMessages[nextStatus].title,
        message: notifyMessages[nextStatus].message,
        eventKey: `service-booking-status:${input.bookingId}:${nextStatus}`,
        metadata: { bookingId: input.bookingId, status: nextStatus },
      }).catch(() => null)
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update booking status' }
  }
}

export async function updateServiceListing(
  merchantId: string,
  serviceId: string,
  updates: {
    title?: string
    description?: string
    category?: string
    basePrice?: number
    workingDays?: string[]
    workingHours?: string
    serviceCity?: string
    serviceState?: string
  },
) {
  try {
    const supabase = await createClient()
    const payload: any = {}
    if (updates.title !== undefined) payload.title = String(updates.title).trim()
    if (updates.description !== undefined) payload.description = String(updates.description).trim() || null
    if (updates.category !== undefined) payload.category = String(updates.category).trim() || null
    if (updates.basePrice !== undefined) payload.base_price = Number(updates.basePrice)
    if (updates.workingDays !== undefined) payload.working_days = updates.workingDays
    if (updates.workingHours !== undefined) payload.working_hours = String(updates.workingHours).trim() || null
    if (updates.serviceCity !== undefined) payload.service_city = String(updates.serviceCity).trim() || null
    if (updates.serviceState !== undefined) payload.service_state = String(updates.serviceState).trim() || null

    const { data, error } = await (supabase.from('service_listings') as any)
      .update(payload)
      .eq('id', serviceId)
      .eq('merchant_id', merchantId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update service' }
  }
}

export async function toggleServiceActive(merchantId: string, serviceId: string, isActive: boolean) {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_listings') as any)
      .update({ is_active: isActive })
      .eq('id', serviceId)
      .eq('merchant_id', merchantId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle service' }
  }
}

export async function deleteServiceListing(merchantId: string, serviceId: string) {
  try {
    const supabase = await createClient()
    const { error } = await (supabase.from('service_listings') as any)
      .delete()
      .eq('id', serviceId)
      .eq('merchant_id', merchantId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete service' }
  }
}
