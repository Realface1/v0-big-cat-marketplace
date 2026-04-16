"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import {
  Bell,
  X,
  Package,
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Truck,
  Clock,
} from "lucide-react"

interface Notification {
  id: string
  type: "order" | "delivery" | "message" | "system" | "warning"
  title: string
  message: string
  time: string
  read: boolean
  createdAt?: string
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  onUnreadChange?: (count: number) => void
}

export function NotificationsPanel({ isOpen, onClose, onUnreadChange }: NotificationsPanelProps) {
  const { role, user } = useRole()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const getNotificationStorageKey = (currentRole: string, userId: string) => `app_notifications_${currentRole}_${userId}`

  const syncStoredNotifications = (nextNotifications: Notification[]) => {
    setNotifications(nextNotifications)

    if (typeof window === "undefined" || !role || !user?.userId) return

    const storedNotifications = nextNotifications.filter((notification) => notification.id !== "welcome")
    localStorage.setItem(getNotificationStorageKey(role, user.userId), JSON.stringify(storedNotifications))
    window.dispatchEvent(new Event("bigcat-notifications-updated"))
  }

  useEffect(() => {
    if (typeof window === "undefined" || !role) return

    const loadNotifications = () => {
      const stored = user?.userId
        ? JSON.parse(localStorage.getItem(getNotificationStorageKey(role, user.userId)) || "[]") as Notification[]
        : []

      const nextNotifications = [...stored]

      if (role === "buyer" || role === "merchant") {
        const hasSeenWelcome = localStorage.getItem(`welcome_notification_${role}`)
        if (!hasSeenWelcome) {
          nextNotifications.unshift({
            id: "welcome",
            type: "system",
            title: "Welcome to BigCat!",
            message: role === "buyer"
              ? "Start exploring our marketplace for amazing deals."
              : "Set up your store and start selling today.",
            time: "Just now",
            read: false,
            createdAt: new Date().toISOString(),
          })
          localStorage.setItem(`welcome_notification_${role}`, "true")
        }
      }

      setNotifications(
        nextNotifications.sort((a, b) => {
          const left = new Date(b.createdAt || 0).getTime()
          const right = new Date(a.createdAt || 0).getTime()
          return left - right
        }),
      )
    }

    loadNotifications()
    window.addEventListener("storage", loadNotifications)
    window.addEventListener("bigcat-notifications-updated", loadNotifications)

    return () => {
      window.removeEventListener("storage", loadNotifications)
      window.removeEventListener("bigcat-notifications-updated", loadNotifications)
    }
  }, [role, user?.userId])

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="w-5 h-5" />
      case "delivery":
        return <Truck className="w-5 h-5" />
      case "message":
        return <MessageSquare className="w-5 h-5" />
      case "warning":
        return <AlertTriangle className="w-5 h-5" />
      case "system":
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getIconStyle = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return "bg-primary/10 text-primary"
      case "delivery":
        return "bg-chart-3/10 text-chart-3"
      case "message":
        return "bg-chart-4/10 text-chart-4"
      case "warning":
        return "bg-destructive/10 text-destructive"
      case "system":
      default:
        return "bg-secondary text-muted-foreground"
    }
  }

  const markAsRead = (id: string) => {
    syncStoredNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
  }

  const markAllAsRead = () => {
    syncStoredNotifications(notifications.map((notification) => ({ ...notification, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    onUnreadChange?.(unreadCount)
  }, [unreadCount, onUnreadChange])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Notifications List */}
        <div className="flex-1 overflow-auto p-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`flex items-start gap-3 p-4 bg-card border rounded-2xl text-left transition-all hover:border-primary/30 ${
                    notification.read ? "border-border" : "border-primary/50 bg-primary/5"
                  }`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${getIconStyle(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium ${notification.read ? "text-foreground" : "text-primary"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notification.time}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
