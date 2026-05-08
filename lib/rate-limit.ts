/**
 * OTP rate limiter using Upstash Redis.
 *
 * Requires env vars (set in Vercel dashboard):
 *   UPSTASH_REDIS_REST_URL=https://...upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * If env vars are not set, rate limiting is skipped (fail-open) with a warning.
 * Sign up free at https://upstash.com → create Redis database → copy REST URL and token.
 *
 * Limits:
 *  - 5 OTP requests per email per 10 minutes
 *  - 10 OTP requests per IP per 10 minutes
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimitByEmail: Ratelimit | null = null
let ratelimitByIp: Ratelimit | null = null

const WINDOW_MS = 10 * 60 * 1000
const EMAIL_LIMIT = 5
const IP_LIMIT = 10

type LocalBucket = {
  count: number
  resetAt: number
}

const localEmailBuckets = new Map<string, LocalBucket>()
const localIpBuckets = new Map<string, LocalBucket>()

function nowMs() {
  return Date.now()
}

function checkLocalSlidingWindow(
  store: Map<string, LocalBucket>,
  key: string,
  limit: number
): { success: boolean; reset: number } {
  const now = nowMs()
  const current = store.get(key)

  if (!current || now >= current.resetAt) {
    const resetAt = now + WINDOW_MS
    store.set(key, { count: 1, resetAt })
    return { success: true, reset: resetAt }
  }

  if (current.count >= limit) {
    return { success: false, reset: current.resetAt }
  }

  current.count += 1
  store.set(key, current)
  return { success: true, reset: current.resetAt }
}

function runLocalFallback(email: string, ip: string): RateLimitResult {
  const emailKey = email.toLowerCase().trim()
  const emailResult = checkLocalSlidingWindow(localEmailBuckets, emailKey, EMAIL_LIMIT)
  if (!emailResult.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((emailResult.reset - nowMs()) / 1000))
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `Too many OTP requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    }
  }

  const ipResult = checkLocalSlidingWindow(localIpBuckets, ip, IP_LIMIT)
  if (!ipResult.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((ipResult.reset - nowMs()) / 1000))
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `Too many requests from your network. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    }
  }

  return { allowed: true }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getEmailRateLimiter(): Ratelimit | null {
  if (ratelimitByEmail) return ratelimitByEmail
  const redis = getRedis()
  if (!redis) return null
  ratelimitByEmail = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'bigcat:otp:email',
    analytics: true,
  })
  return ratelimitByEmail
}

function getIpRateLimiter(): Ratelimit | null {
  if (ratelimitByIp) return ratelimitByIp
  const redis = getRedis()
  if (!redis) return null
  ratelimitByIp = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'),
    prefix: 'bigcat:otp:ip',
    analytics: true,
  })
  return ratelimitByIp
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
  reason?: string
}

/**
 * Check OTP rate limits for a given email and IP.
 * Returns { allowed: true } if under limit or Upstash is not configured.
 */
export async function checkOtpRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const emailLimiter = getEmailRateLimiter()
  const ipLimiter = getIpRateLimiter()

  if (!emailLimiter || !ipLimiter) {
    console.warn('[rate-limit] Upstash not configured — using local in-memory fallback rate limiting.')
    return runLocalFallback(email, ip)
  }

  try {
    const [emailResult, ipResult] = await Promise.all([
      emailLimiter.limit(email.toLowerCase().trim()),
      ipLimiter.limit(ip),
    ])

    if (!emailResult.success) {
      const retryAfterSeconds = Math.ceil((emailResult.reset - Date.now()) / 1000)
      console.warn('[rate-limit] Email OTP rate limit exceeded', { email, ip })
      return {
        allowed: false,
        retryAfterSeconds,
        reason: `Too many OTP requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      }
    }

    if (!ipResult.success) {
      const retryAfterSeconds = Math.ceil((ipResult.reset - Date.now()) / 1000)
      console.warn('[rate-limit] IP OTP rate limit exceeded', { ip })
      return {
        allowed: false,
        retryAfterSeconds,
        reason: `Too many requests from your network. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      }
    }

    return { allowed: true }
  } catch (err: any) {
    console.error('[rate-limit] Upstash rate limit check failed, using local in-memory fallback:', err?.message)
    return runLocalFallback(email, ip)
  }
}
