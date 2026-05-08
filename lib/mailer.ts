/**
 * Shared email transport for BigCat Marketplace.
 *
 * Priority:
 *  1. Resend (RESEND_API_KEY set) — primary, scales to millions/day
 *  2. SMTP via nodemailer (EMAIL_HOST set) — fallback; Gmail is capped ~500/day
 *
 * Required env vars for Resend (recommended):
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM_EMAIL=BigCat Marketplace <noreply@yourdomain.com>
 *
 * Required env vars for SMTP fallback (Gmail example):
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your@gmail.com
 *   EMAIL_PASS=your-app-password   (Google Account → Security → App Passwords)
 *   EMAIL_FROM=BigCat Marketplace <your@gmail.com>
 */
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface SendEmailResult {
  success: boolean
  provider?: 'smtp' | 'resend'
  error?: string
}

let smtpTransport: nodemailer.Transporter | null = null
let resendClient: Resend | null = null

function getEnv(name: string) {
  return String(process.env[name] || '').trim()
}

function getSmtpTransport(): nodemailer.Transporter | null {
  const host = getEnv('EMAIL_HOST')
  if (!host) return null

  if (smtpTransport) return smtpTransport

  const portRaw = getEnv('EMAIL_PORT') || '587'
  const port = parseInt(portRaw, 10)
  const secure = getEnv('EMAIL_SECURE') === 'true' || port === 465
  const user = getEnv('EMAIL_USER')
  const pass = getEnv('EMAIL_PASS')

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user,
      pass,
    },
  })

  return smtpTransport
}

function getResendClient(): Resend | null {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendClient = new Resend(apiKey)
  return resendClient
}

function defaultFrom(): string {
  // Resend from address (preferred)
  if (getEnv('RESEND_FROM_EMAIL')) return getEnv('RESEND_FROM_EMAIL')
  // SMTP from address
  if (getEnv('EMAIL_FROM')) return getEnv('EMAIL_FROM')
  if (getEnv('EMAIL_USER')) return `BigCat Marketplace <${getEnv('EMAIL_USER')}>`
  return 'BigCat Marketplace <onboarding@resend.dev>'
}

function isTransientSmtpError(error: any) {
  const code = String(error?.code || '').toUpperCase()
  const message = String(error?.message || '').toLowerCase()
  return code === 'EAI_AGAIN'
    || code === 'EBUSY'
    || code === 'ESOCKET'
    || code === 'ECONNRESET'
    || code === 'ETIMEDOUT'
    || message.includes('getaddrinfo')
    || message.includes('timed out')
}

/**
 * Send a transactional email.
 * Tries Resend first (no daily cap, production-grade), falls back to SMTP.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from || defaultFrom()

  // --- 1. Try Resend (primary — scales to millions/day) ---
  const resend = getResendClient()
  if (resend) {
    try {
      await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text || input.subject,
      })
      return { success: true, provider: 'resend' }
    } catch (err: any) {
      console.error('[mailer] Resend send failed, trying SMTP fallback:', err?.message)
    }
  }

  // --- 2. Fall back to SMTP (Gmail capped ~500/day; use SES/Brevo for production SMTP) ---
  const smtp = getSmtpTransport()
  if (smtp) {
    const maxAttempts = 3
    let lastError: any = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await smtp.sendMail({
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        })
        return { success: true, provider: 'smtp' }
      } catch (err: any) {
        lastError = err
        const shouldRetry = attempt < maxAttempts && isTransientSmtpError(err)
        console.error(`[mailer] SMTP send failed (attempt ${attempt}/${maxAttempts}):`, err?.message)
        if (!shouldRetry) break
        smtpTransport = null
      }
    }

    const smtpError = lastError?.message || 'SMTP send failed'
    console.error('[mailer] SMTP also failed after retries:', smtpError)
    return { success: false, provider: 'smtp', error: smtpError }
  }

  console.warn(
    '[mailer] No email provider configured. ' +
    'Set RESEND_API_KEY (Resend) or EMAIL_HOST + EMAIL_USER + EMAIL_PASS (SMTP) in your environment variables. ' +
    `Email to ${input.to} with subject "${input.subject}" was NOT sent.`
  )
  return {
    success: false,
    error: 'No email provider configured. Set RESEND_API_KEY or EMAIL_HOST (SMTP).',
  }
}
