type WhatsAppWebhookPayload = {
  type: 'notification' | 'otp'
  to: string
  title?: string
  message: string
  otp?: string
  role?: 'buyer' | 'merchant'
  email?: string
  eventKey?: string
  metadata?: Record<string, any>
}

export interface SendWhatsAppResult {
  success: boolean
  error?: string
}

function getEnv(name: string) {
  return String(process.env[name] || '').trim()
}

function normalizePhoneNumber(phone: string): string {
  const raw = String(phone || '').trim()
  if (!raw) return ''

  const cleaned = raw.replace(/[\s()-]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`
  if (cleaned.startsWith('234')) return `+${cleaned}`
  return cleaned
}

async function postToWebhook(url: string, payload: WhatsAppWebhookPayload): Promise<SendWhatsAppResult> {
  if (!url) return { success: false, error: 'WhatsApp webhook is not configured' }

  const secret = getEnv('WHATSAPP_WEBHOOK_SECRET')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-bigcat-whatsapp-secret': secret } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text || `WhatsApp webhook failed with status ${response.status}` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to send WhatsApp message' }
  }
}

export async function sendWhatsAppNotification(input: {
  to: string
  title: string
  message: string
  eventKey?: string
  metadata?: Record<string, any>
}): Promise<SendWhatsAppResult> {
  const webhookUrl = getEnv('WHATSAPP_NOTIFICATIONS_WEBHOOK_URL') || getEnv('WHATSAPP_WEBHOOK_URL')
  const to = normalizePhoneNumber(input.to)

  if (!to) {
    return { success: false, error: 'Missing phone number for WhatsApp notification' }
  }

  return postToWebhook(webhookUrl, {
    type: 'notification',
    to,
    title: input.title,
    message: input.message,
    eventKey: input.eventKey,
    metadata: input.metadata,
  })
}

export async function sendWhatsAppOtp(input: {
  to: string
  otp: string
  role: 'buyer' | 'merchant'
  email: string
}): Promise<SendWhatsAppResult> {
  const webhookUrl = getEnv('WHATSAPP_OTP_WEBHOOK_URL') || getEnv('WHATSAPP_WEBHOOK_URL')
  const to = normalizePhoneNumber(input.to)

  if (!to) {
    return { success: false, error: 'Missing phone number for WhatsApp OTP' }
  }

  const message = `Your BigCat ${input.role === 'merchant' ? 'merchant ' : ''}verification code is ${input.otp}. It expires in 5 minutes.`

  return postToWebhook(webhookUrl, {
    type: 'otp',
    to,
    otp: input.otp,
    role: input.role,
    email: input.email,
    message,
  })
}
