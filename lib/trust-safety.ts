export const USER_STRIKES_KEY = "user_strikes"
const USER_SUSPENSIONS_KEY = "user_suspensions"
const DEFAULT_SUSPENSION_MINUTES = 60

const parsedMinutes = Number(process.env.NEXT_PUBLIC_CONTACT_SUSPENSION_MINUTES)
const suspensionMinutes = Number.isFinite(parsedMinutes) && parsedMinutes > 0
  ? parsedMinutes
  : DEFAULT_SUSPENSION_MINUTES

const SUSPENSION_DURATION_MS = suspensionMinutes * 60 * 1000

const CONTACT_PATTERNS: RegExp[] = [
  /phone\s*number/i,
  /whats\s*app|whatsapp/i,
  /call\s+me/i,
  /text\s+me/i,
  /dm\s+me/i,
  /email\s+me/i,
  /contact\s+me/i,
  /send\s+your\s+number/i,
  /let'?s\s+talk\s+outside/i,
  /drop\s+your\s+number/i,
  /share\s+your\s+number/i,
  /reach\s+me\s+on/i,
  /outside\s+(the\s+)?app/i,
  /off\s+(the\s+)?platform/i,
]

const CONTACT_VALUE_PATTERNS: RegExp[] = [
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /\b(?:\+?234|0)[789][01]\d{8}\b/,
  /(?:telegram|t\.me|instagram|ig|facebook|fb|snapchat|twitter|x)\s*[:@]?\s*[a-z0-9._-]{3,}/i,
]

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readMap(key: string): Record<string, number | boolean> {
  if (!canUseStorage()) return {}

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(key: string, value: Record<string, number | boolean>) {
  if (!canUseStorage()) return
  localStorage.setItem(key, JSON.stringify(value))
}

function resolveUserId(userId?: string) {
  return userId || "guest"
}

function readSuspensionExpiry(userKey: string) {
  const suspensions = readMap(USER_SUSPENSIONS_KEY)
  const value = suspensions[userKey]

  // Backward compatibility: old boolean suspensions are converted to expiring suspensions.
  if (value === true) {
    const expiresAt = Date.now() + SUSPENSION_DURATION_MS
    suspensions[userKey] = expiresAt
    writeMap(USER_SUSPENSIONS_KEY, suspensions)
    return expiresAt
  }

  if (typeof value === "number") {
    return value
  }

  return null
}

function formatWithCollapsedWhitespace(message: string) {
  return message.replace(/\s+/g, " ").trim()
}

function hasPhoneLikeSequence(message: string) {
  const compactDigits = message.replace(/\D/g, "")
  if (compactDigits.length < 10) return false

  // Treat clear phone-style patterns as contact leakage signals.
  if (compactDigits.startsWith("234") && compactDigits.length >= 13) return true
  if (compactDigits.startsWith("0") && compactDigits.length >= 11) return true

  return false
}

export function containsBlockedContactRequest(message: string) {
  const normalized = formatWithCollapsedWhitespace(message)

  if (CONTACT_PATTERNS.some((pattern) => pattern.test(normalized))) return true
  if (CONTACT_VALUE_PATTERNS.some((pattern) => pattern.test(normalized))) return true

  return hasPhoneLikeSequence(normalized)
}

export function getUserStrikeCount(userId?: string) {
  const userKey = resolveUserId(userId)
  const strikes = readMap(USER_STRIKES_KEY)
  const value = strikes[userKey]
  return typeof value === "number" ? value : 0
}

export function isUserSuspended(userId?: string) {
  const userKey = resolveUserId(userId)
  const expiresAt = readSuspensionExpiry(userKey)
  if (!expiresAt) return false

  if (expiresAt > Date.now()) {
    return true
  }

  const suspensions = readMap(USER_SUSPENSIONS_KEY)
  delete suspensions[userKey]
  writeMap(USER_SUSPENSIONS_KEY, suspensions)
  return false
}

export function getUserSuspensionRemainingMs(userId?: string) {
  const userKey = resolveUserId(userId)
  const expiresAt = readSuspensionExpiry(userKey)
  if (!expiresAt) return 0
  return Math.max(0, expiresAt - Date.now())
}

export function syncSafetyStateFromServer(
  userId: string | undefined,
  state: { strikes?: number; suspended?: boolean; remainingMs?: number }
) {
  const userKey = resolveUserId(userId)
  const nextStrikes = Math.max(0, Number(state.strikes || 0))

  const strikes = readMap(USER_STRIKES_KEY)
  strikes[userKey] = nextStrikes
  writeMap(USER_STRIKES_KEY, strikes)

  const suspensions = readMap(USER_SUSPENSIONS_KEY)
  if (state.suspended && Number(state.remainingMs || 0) > 0) {
    suspensions[userKey] = Date.now() + Number(state.remainingMs || 0)
  } else {
    delete suspensions[userKey]
  }
  writeMap(USER_SUSPENSIONS_KEY, suspensions)
}

export function recordSafetyViolation(userId?: string) {
  const userKey = resolveUserId(userId)
  const current = getUserStrikeCount(userKey)
  const nextCount = current + 1

  const strikes = readMap(USER_STRIKES_KEY)
  strikes[userKey] = nextCount
  writeMap(USER_STRIKES_KEY, strikes)

  let suspensionRemainingMs = 0
  if (nextCount >= 2) {
    const suspensions = readMap(USER_SUSPENSIONS_KEY)
    const expiresAt = Date.now() + SUSPENSION_DURATION_MS
    suspensions[userKey] = expiresAt
    writeMap(USER_SUSPENSIONS_KEY, suspensions)
    suspensionRemainingMs = SUSPENSION_DURATION_MS
  }

  return {
    strikes: nextCount,
    suspended: nextCount >= 2,
    suspensionRemainingMs,
  }
}

export function resetSafetyState(userId?: string) {
  const userKey = resolveUserId(userId)

  const strikes = readMap(USER_STRIKES_KEY)
  delete strikes[userKey]
  writeMap(USER_STRIKES_KEY, strikes)

  const suspensions = readMap(USER_SUSPENSIONS_KEY)
  delete suspensions[userKey]
  writeMap(USER_SUSPENSIONS_KEY, suspensions)
}
