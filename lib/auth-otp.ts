import { createHash, randomInt } from 'crypto'
import { sendEmail } from '@/lib/mailer'

export const SIGNUP_OTP_COOKIE = 'bigcat_signup_otp'
export const SIGNUP_OTP_TTL_SECONDS = 60 * 5

export type PendingSignupOtp = {
  email: string
  role: 'buyer' | 'merchant'
  otpHash: string
  expiresAt: number
}

function getOtpSecret() {
  return process.env.AUTH_OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bigcat-dev-otp-secret'
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtp(email: string, role: 'buyer' | 'merchant', otp: string) {
  return createHash('sha256')
    .update(`${email.toLowerCase().trim()}:${role}:${otp}:${getOtpSecret()}`)
    .digest('hex')
}

export function encodePendingSignupOtp(payload: PendingSignupOtp) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodePendingSignupOtp(value?: string | null): PendingSignupOtp | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!parsed?.email || !parsed?.role || !parsed?.otpHash || !parsed?.expiresAt) return null
    return parsed as PendingSignupOtp
  } catch {
    return null
  }
}

export function isOtpValid(payload: PendingSignupOtp | null, email: string, role: 'buyer' | 'merchant', otp: string) {
  if (!payload) return false
  if (Date.now() > Number(payload.expiresAt || 0)) return false
  if (payload.email.toLowerCase().trim() !== email.toLowerCase().trim()) return false
  if (payload.role !== role) return false
  return payload.otpHash === hashOtp(email, role, otp)
}

export async function sendSignupOtpEmail(email: string, otp: string, role: 'buyer' | 'merchant') {
  const subject = `Your BigCat ${role === 'merchant' ? 'merchant ' : ''}verification code`
  const safeEmail = String(email || '').trim()
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">BigCat Marketplace</p>
        <h1 style="margin:0 0 12px;color:#0f172a;font-size:24px;">Verify your email</h1>
        <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">
          Use the verification code below to complete your ${role} account signup for <strong>${safeEmail}</strong>.
        </p>
        <div style="margin:0 0 20px;padding:18px 20px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;">
          <div style="font-size:32px;line-height:1;font-weight:700;letter-spacing:0.35em;color:#1d4ed8;">${otp}</div>
        </div>
        <p style="margin:0 0 8px;color:#334155;font-size:14px;line-height:1.6;">This code expires in 5 minutes.</p>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">If you did not request this code, you can ignore this email.</p>
      </div>
    </div>
  `
  const text = `BigCat Marketplace\n\nUse this verification code to complete your ${role} account signup for ${safeEmail}: ${otp}\n\nThis code expires in 5 minutes.`

  const result = await sendEmail({ to: safeEmail, subject, html, text })
  if (!result.success) {
    return { success: false, error: result.error || 'Failed to send OTP email.' }
  }
  return { success: true }
}