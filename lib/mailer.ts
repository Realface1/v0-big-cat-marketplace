/**
 * Shared email transport for BigCat Marketplace.
 *
 * Priority:
 *  1. SMTP via nodemailer (EMAIL_HOST set) — works with Gmail, AWS SES, Brevo, Mailersend, etc.
 *  2. Resend (RESEND_API_KEY set) — fallback, free tier restricted to registered domain
 *
 * Required env vars for SMTP (Gmail example):
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your@gmail.com
 *   EMAIL_PASS=your-app-password   (Google Account → Security → App Passwords)
 *   EMAIL_FROM=BigCat Marketplace <your@gmail.com>
 *
 * For other providers (Brevo, Mailersend, AWS SES SMTP, etc.):
 *   Just change EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS accordingly.
 *   EMAIL_SECURE=true  for port 465 (SSL); omit or set false for port 587 (TLS/STARTTLS)
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
  // SMTP from address
  if (getEnv('EMAIL_FROM')) return getEnv('EMAIL_FROM')
  if (getEnv('EMAIL_USER')) return `BigCat Marketplace <${getEnv('EMAIL_USER')}>`
  // Resend from address
  if (getEnv('RESEND_FROM_EMAIL')) return getEnv('RESEND_FROM_EMAIL')
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
 * Send a transactional email. Tries SMTP first, falls back to Resend.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from || defaultFrom()

  // --- 1. Try SMTP ---
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

        // Reset transport before retry so nodemailer can establish a fresh socket.
        smtpTransport = null
      }
    }

    console.error('[mailer] SMTP failed after retries, trying Resend fallback')
    if (!lastError) {
      return { success: false, provider: 'smtp', error: 'SMTP send failed' }
    }
  }

  // --- 2. Fall back to Resend ---
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
      console.error('[mailer] Resend send failed:', err?.message)
      return { success: false, provider: 'resend', error: err?.message || 'Resend send failed' }
    }
  }

  console.warn(
    '[mailer] No email provider configured. ' +
    'Set EMAIL_HOST + EMAIL_USER + EMAIL_PASS (SMTP) or RESEND_API_KEY (Resend) in your environment variables. ' +
    `Email to ${input.to} with subject "${input.subject}" was NOT sent.`
  )
  return {
    success: false,
    error: 'No email provider configured. Set EMAIL_HOST (SMTP) or RESEND_API_KEY.',
  }
}
