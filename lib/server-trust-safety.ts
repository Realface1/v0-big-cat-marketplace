import { createClient } from '@/lib/supabase/server'

type SafetyStateRow = {
  user_id: string
  strike_count: number
  suspended_until: string | null
}

type SafetyStatus = {
  strikes: number
  suspended: boolean
  suspendedUntil: string | null
  remainingMs: number
}

const DEFAULT_STRIKE_THRESHOLD = 2
const DEFAULT_SUSPENSION_MINUTES = 60

function getPositiveInteger(raw: string | undefined, fallback: number) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed <= 0) return fallback
  return Math.floor(parsed)
}

const STRIKE_THRESHOLD = getPositiveInteger(process.env.CONTACT_STRIKE_THRESHOLD, DEFAULT_STRIKE_THRESHOLD)
const SUSPENSION_MINUTES = getPositiveInteger(process.env.NEXT_PUBLIC_CONTACT_SUSPENSION_MINUTES, DEFAULT_SUSPENSION_MINUTES)
const SUSPENSION_DURATION_MS = SUSPENSION_MINUTES * 60 * 1000

function computeRemainingMs(suspendedUntil: string | null) {
  if (!suspendedUntil) return 0
  const until = new Date(suspendedUntil).getTime()
  if (!Number.isFinite(until)) return 0
  return Math.max(0, until - Date.now())
}

function toSafetyStatus(row: SafetyStateRow): SafetyStatus {
  const remainingMs = computeRemainingMs(row.suspended_until)
  return {
    strikes: Number(row.strike_count || 0),
    suspended: remainingMs > 0,
    suspendedUntil: row.suspended_until,
    remainingMs,
  }
}

async function ensureSafetyRow(userId: string): Promise<SafetyStateRow> {
  const supabase = createClient()
  const { data: existing, error: existingError } = await supabase
    .from('user_safety_states')
    .select('user_id, strike_count, suspended_until')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing as SafetyStateRow

  const { data: created, error: createError } = await supabase
    .from('user_safety_states')
    .insert({ user_id: userId, strike_count: 0, suspended_until: null })
    .select('user_id, strike_count, suspended_until')
    .single()

  if (createError) throw createError
  return created as SafetyStateRow
}

async function clearExpiredSuspension(userId: string, row: SafetyStateRow): Promise<SafetyStateRow> {
  if (!row.suspended_until) return row

  const remainingMs = computeRemainingMs(row.suspended_until)
  if (remainingMs > 0) return row

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_safety_states')
    .update({
      strike_count: 0,
      suspended_until: null,
    })
    .eq('user_id', userId)
    .select('user_id, strike_count, suspended_until')
    .single()

  if (error) throw error
  return data as SafetyStateRow
}

export async function getUserSafetyStatus(userId: string): Promise<SafetyStatus> {
  let row = await ensureSafetyRow(userId)
  row = await clearExpiredSuspension(userId, row)
  return toSafetyStatus(row)
}

export async function recordContactSafetyViolation(userId: string): Promise<SafetyStatus> {
  let row = await ensureSafetyRow(userId)
  row = await clearExpiredSuspension(userId, row)

  const nextStrikes = Number(row.strike_count || 0) + 1
  const shouldSuspend = nextStrikes >= STRIKE_THRESHOLD
  const nextSuspendedUntil = shouldSuspend ? new Date(Date.now() + SUSPENSION_DURATION_MS).toISOString() : null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_safety_states')
    .update({
      strike_count: nextStrikes,
      suspended_until: nextSuspendedUntil,
      last_violation_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id, strike_count, suspended_until')
    .single()

  if (error) throw error
  return toSafetyStatus(data as SafetyStateRow)
}
