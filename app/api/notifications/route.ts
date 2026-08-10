import { NextRequest, NextResponse } from "next/server"
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationType,
} from "@/lib/notifications"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(undefined, request)
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = Number(searchParams.get("limit") || 50)
    const typeParam = searchParams.get("type")

    const validType = ["order", "system", "alert", "report"].includes(String(typeParam))
      ? (typeParam as NotificationType)
      : undefined

    const result = await fetchUserNotifications(auth.user.id, {
      unreadOnly,
      limit,
      type: validType,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Notifications GET API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(undefined, request)
    if (auth.response) return auth.response

    const body = await request.json().catch(() => ({}))
    const notificationId = String(body?.notificationId || "").trim()
    const markAll = Boolean(body?.markAll)

    const result = markAll
      ? await markAllNotificationsRead(auth.user.id)
      : await markNotificationRead(auth.user.id, notificationId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Notifications PATCH API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
