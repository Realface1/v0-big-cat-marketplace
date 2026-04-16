export const USER_STRIKES_KEY = "user_strikes"
const USER_SUSPENSIONS_KEY = "user_suspensions"

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

export function containsBlockedContactRequest(message: string) {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(message))
}

export function getUserStrikeCount(userId?: string) {
  const userKey = resolveUserId(userId)
  const strikes = readMap(USER_STRIKES_KEY)
  const value = strikes[userKey]
  return typeof value === "number" ? value : 0
}

export function isUserSuspended(userId?: string) {
  const userKey = resolveUserId(userId)
  const suspensions = readMap(USER_SUSPENSIONS_KEY)
  return Boolean(suspensions[userKey])
}

export function recordSafetyViolation(userId?: string) {
  const userKey = resolveUserId(userId)
  const current = getUserStrikeCount(userKey)
  const nextCount = current + 1

  const strikes = readMap(USER_STRIKES_KEY)
  strikes[userKey] = nextCount
  writeMap(USER_STRIKES_KEY, strikes)

  if (nextCount >= 2) {
    const suspensions = readMap(USER_SUSPENSIONS_KEY)
    suspensions[userKey] = true
    writeMap(USER_SUSPENSIONS_KEY, suspensions)
  }

  return {
    strikes: nextCount,
    suspended: nextCount >= 2,
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
