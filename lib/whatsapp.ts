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

type MetaTextMessagePayload = {
  messaging_product: 'whatsapp'
  to: string
  type: 'text'
  text: {
    preview_url: boolean
    body: string
  }
}

type MetaTemplateMessagePayload = {
  messaging_product: 'whatsapp'
  to: string
  type: 'template'
  template: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: 'body'
      parameters: Array<{
        type: 'text'
        text: string
      }>
    }>
  }
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

function getMetaRecipientNumber(phone: string) {
  return normalizePhoneNumber(phone).replace(/[^\d]/g, '')
}

function hasDirectWhatsAppConfig() {
  return Boolean(getEnv('WHATSAPP_ACCESS_TOKEN') && getEnv('WHATSAPP_PHONE_NUMBER_ID'))
}

function getMetaApiUrl() {
  const apiVersion = getEnv('WHATSAPP_API_VERSION') || 'v22.0'
  const phoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID')
  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
}

async function postToMeta(payload: MetaTextMessagePayload | MetaTemplateMessagePayload): Promise<SendWhatsAppResult> {
  const accessToken = getEnv('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID')

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'Direct WhatsApp API is not configured' }
  }

  try {
    const response = await fetch(getMetaApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      try {
        const parsed = JSON.parse(text)
        const code = parsed?.error?.code
        if (code === 131030) {
          return {
            success: false,
            error: 'Recipient number is not in your WhatsApp test allowed list. Add the number in Meta WhatsApp API Setup and try again.',
          }
        }
      } catch {
        // Fall back to raw response text when the error is not JSON.
      }
      return { success: false, error: text || `WhatsApp API failed with status ${response.status}` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to send direct WhatsApp message' }
  }
}

function getTemplateLanguage() {
  return getEnv('WHATSAPP_TEMPLATE_LANGUAGE') || 'en'
}

function buildTemplatePayload(to: string, templateName: string, parameters: string[]): MetaTemplateMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: getTemplateLanguage(),
      },
      ...(parameters.length > 0
        ? {
            components: [
              {
                type: 'body',
                parameters: parameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          }
        : {}),
    },
  }
}

function buildTextPayload(to: string, body: string): MetaTextMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  }
}

function resolveNotificationTemplateName(input: { title: string; message: string; eventKey?: string }) {
  const text = `${String(input.eventKey || '').toLowerCase()} ${input.title.toLowerCase()} ${input.message.toLowerCase()}`

  if (text.includes('payment')) {
    return getEnv('WHATSAPP_PAYMENT_TEMPLATE_NAME') || getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_NAME')
  }

  if (text.includes('in_transit') || text.includes('in transit') || text.includes('delivery update')) {
    return getEnv('WHATSAPP_IN_TRANSIT_TEMPLATE_NAME') || getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_NAME')
  }

  if (text.includes('delivered') || text.includes('completed')) {
    return getEnv('WHATSAPP_DELIVERED_TEMPLATE_NAME') || getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_NAME')
  }

  return getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_NAME')
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
  const to = normalizePhoneNumber(input.to)
  const metaTo = getMetaRecipientNumber(input.to)

  if (!to) {
    return { success: false, error: 'Missing phone number for WhatsApp notification' }
  }

  if (hasDirectWhatsAppConfig()) {
    const templateName = resolveNotificationTemplateName(input)
    if (templateName) {
      return postToMeta(buildTemplatePayload(metaTo, templateName, [input.title, input.message]))
    }

    return postToMeta(buildTextPayload(metaTo, `${input.title}\n\n${input.message}`))
  }

  const webhookUrl = getEnv('WHATSAPP_NOTIFICATIONS_WEBHOOK_URL') || getEnv('WHATSAPP_WEBHOOK_URL')

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
  const to = normalizePhoneNumber(input.to)
  const metaTo = getMetaRecipientNumber(input.to)

  if (!to) {
    return { success: false, error: 'Missing phone number for WhatsApp OTP' }
  }

  const message = `Your BigCat ${input.role === 'merchant' ? 'merchant ' : ''}verification code is ${input.otp}. It expires in 5 minutes.`

  if (hasDirectWhatsAppConfig()) {
    const otpTemplateName = getEnv('WHATSAPP_OTP_TEMPLATE_NAME')
    if (otpTemplateName) {
      return postToMeta(buildTemplatePayload(metaTo, otpTemplateName, [input.otp, '5']))
    }

    return postToMeta(buildTextPayload(metaTo, message))
  }

  const webhookUrl = getEnv('WHATSAPP_OTP_WEBHOOK_URL') || getEnv('WHATSAPP_WEBHOOK_URL')

  return postToWebhook(webhookUrl, {
    type: 'otp',
    to,
    otp: input.otp,
    role: input.role,
    email: input.email,
    message,
  })
}
