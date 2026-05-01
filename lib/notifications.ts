"use server"

import { sendEmail } from "@/lib/mailer"
import { createClient } from "@/lib/supabase/server"

export type NotificationType = "order" | "system" | "alert" | "report"

type JsonRecord = Record<string, any>

export interface DispatchNotificationInput {
  userId: string
  title: string
  message: string
  type: NotificationType
  eventKey?: string
  metadata?: JsonRecord
  sendEmail?: boolean
  emailSubject?: string
  emailHtml?: string
  emailText?: string
}

interface NotificationRow {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  created_at: string
  read_at: string | null
  metadata?: JsonRecord | null
}

function isMissingNotificationInfraError(error: any) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("does not exist")
    || message.includes("relation")
    || message.includes("schema cache")
    || message.includes("could not find")
    || message.includes("column")
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildDefaultEmailHtml(title: string, message: string) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />")

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
        <h2 style="margin:0 0 12px 0;color:#0f172a;font-size:20px;">${safeTitle}</h2>
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${safeMessage}</p>
        <p style="margin:20px 0 0;color:#64748b;font-size:12px;">BigCat Marketplace Automation</p>
      </div>
    </div>
  `
}

async function hasProcessedEvent(eventKey: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase.from("automation_events") as any)
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle()

  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return false
    }
    throw error
  }

  return Boolean(data)
}

async function recordProcessedEvent(eventKey: string, userId: string, type: NotificationType, metadata?: JsonRecord) {
  const supabase = await createClient()
  const payload = {
    event_key: eventKey,
    user_id: userId,
    event_type: type,
    metadata: metadata || null,
  }

  const { error } = await (supabase.from("automation_events") as any).insert(payload)
  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (message.includes("duplicate key")) {
      return
    }
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return
    }
    throw error
  }
}

async function insertNotification(payload: {
  user_id: string
  title: string
  message: string
  type: NotificationType
  metadata?: JsonRecord | null
  event_key?: string | null
}) {
  const supabase = await createClient()

  const attempts = [
    {
      ...payload,
      metadata: payload.metadata || null,
      event_key: payload.event_key || null,
    },
    {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      event_key: payload.event_key || null,
    },
    {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    },
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const { error } = await (supabase.from("user_notifications") as any).insert(attempt)
    if (!error) return { inserted: true }

    const message = String(error.message || "").toLowerCase()
    if (message.includes("column") || message.includes("schema cache") || message.includes("does not exist")) {
      lastError = error
      continue
    }

    throw error
  }

  if (lastError) {
    if (isMissingNotificationInfraError(lastError)) {
      return { inserted: false, skipped: true, reason: "Notification tables are not available yet" }
    }
    throw lastError
  }

  return { inserted: false, skipped: true, reason: "Notification insert was skipped" }
}

async function maybeSendEmail(userId: string, input: DispatchNotificationInput) {
  if (input.sendEmail === false) {
    return { sent: false, reason: "Email disabled for this event" }
  }

  const supabase = await createClient()
  const { data: profile, error } = await (supabase.from("auth_users") as any)
    .select("email, name, business_name, email_notifications")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    return { sent: false, reason: `Could not read user profile: ${error.message}` }
  }

  const email = String(profile?.email || "").trim()
  if (!email) {
    return { sent: false, reason: "Missing user email" }
  }

  if (profile?.email_notifications === false) {
    return { sent: false, reason: "User disabled email notifications" }
  }

  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "BigCat Marketplace <onboarding@resend.dev>"
  const subject = input.emailSubject || input.title
  const html = input.emailHtml || buildDefaultEmailHtml(input.title, input.message)
  const text = input.emailText || `${input.title}\n\n${input.message}`

  const result = await sendEmail({ from, to: email, subject, html, text })
  return result.success ? { sent: true as const } : { sent: false, reason: result.error }
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  const userId = String(input.userId || "").trim()
  if (!userId) {
    return { success: false, error: "userId is required" }
  }

  const eventKey = input.eventKey?.trim() || ""

  if (eventKey) {
    try {
      const alreadyProcessed = await hasProcessedEvent(eventKey)
      if (alreadyProcessed) {
        return { success: true, skipped: true, reason: "Duplicate event blocked" }
      }
    } catch (error: any) {
      if (!isMissingNotificationInfraError(error)) {
        throw error
      }
    }
  }

  const notificationInsert = await insertNotification({
    user_id: userId,
    title: input.title,
    message: input.message,
    type: input.type,
    metadata: input.metadata || null,
    event_key: eventKey || null,
  })

  const emailResult = await maybeSendEmail(userId, input)

  if (eventKey) {
    try {
      await recordProcessedEvent(eventKey, userId, input.type, {
        ...(input.metadata || {}),
        email_sent: Boolean(emailResult.sent),
        email_reason: emailResult.sent ? null : emailResult.reason,
      })
    } catch (error: any) {
      if (!isMissingNotificationInfraError(error)) {
        throw error
      }
    }
  }

  return {
    success: true,
    notification: notificationInsert,
    email: emailResult,
  }
}

export async function fetchUserNotifications(userId: string, options?: { limit?: number; unreadOnly?: boolean; type?: NotificationType }) {
  const supabase = await createClient()
  let query = (supabase.from("user_notifications") as any)
    .select("id, user_id, title, message, type, created_at, read_at, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(options?.limit || 50, 200)))

  if (options?.unreadOnly) {
    query = query.is("read_at", null)
  }

  if (options?.type) {
    query = query.eq("type", options.type)
  }

  const { data, error } = await query
  if (error) {
    return { success: false, error: error.message, data: [] as NotificationRow[] }
  }

  return { success: true, data: (data || []) as NotificationRow[] }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const supabase = await createClient()
  const { error } = await (supabase.from("user_notifications") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const { error } = await (supabase.from("user_notifications") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
