"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import {
  ArrowLeft,
  Bell,
  Package,
  ShoppingBag,
  MessageSquare,
  Clock,
} from "lucide-react"

interface Notification {
  id: string
  type: "order" | "system" | "alert" | "report"
  title: string
  message: string
  time: string
  read: boolean
  createdAt?: string
  metadata?: {
    action?: string
    actionPath?: string
    orderId?: string
    trackingId?: string
    [key: string]: any
  }
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  onUnreadChange?: (count: number) => void
  onOpenOrders?: () => void
  onOpenMessages?: () => void
}

export function NotificationsPanel({ isOpen, onClose, onUnreadChange, onOpenOrders, onOpenMessages }: NotificationsPanelProps) {
  const { user } = useRole()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | Notification['type']>('all')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const hydrateNotifications = async () => {
    if (!user?.userId) {
      setNotifications([])
      return
    }

    try {
      const response = await fetch('/api/notifications?limit=100', { cache: 'no-store' })
      const result = await response.json()
      if (!result?.success) return

      const mapped = (result.data || []).map((item: any) => ({
        id: String(item.id),
        type: (['order', 'system', 'alert', 'report'].includes(String(item.type)) ? item.type : 'system') as Notification['type'],
        title: String(item.title || 'Notification'),
        message: String(item.message || ''),
        read: Boolean(item.read_at),
        createdAt: item.created_at || new Date().toISOString(),
        metadata: item.metadata || undefined,
        time: item.created_at
          ? new Date(item.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
          : 'Just now',
      }))

      setNotifications(mapped)
    } catch {
      // Keep previous notifications on fetch failure.
    }
  }

  useEffect(() => {
    hydrateNotifications()
  }, [user?.userId])

  useEffect(() => {
    if (!isOpen || !user?.userId) return
    hydrateNotifications()
  }, [isOpen, user?.userId])

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="w-5 h-5" />
      case "report":
        return <Package className="w-5 h-5" />
      case "alert":
        return <MessageSquare className="w-5 h-5" />
      case "system":
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getIconStyle = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return "bg-primary/10 text-primary"
      case "report":
        return "bg-chart-3/10 text-chart-3"
      case "alert":
        return "bg-destructive/10 text-destructive"
      case "system":
      default:
        return "bg-secondary text-muted-foreground"
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )

    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => null)
  }

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification)
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const markAllAsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))

    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => null)
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter((notification) => notification.type === activeFilter)

  const selectedNotificationDetails = selectedNotification
    ? notifications.find((notification) => notification.id === selectedNotification.id) || selectedNotification
    : null

  const getPrimaryAction = (notification: Notification) => {
    if (notification.metadata?.action === 'track_package' && notification.metadata?.actionPath) {
      return {
        label: 'Track Package',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = String(notification.metadata?.actionPath)
          }
          onClose()
        },
      }
    }

    if (notification.type === 'order' || notification.type === 'report') {
      return {
        label: 'View Orders',
        onClick: () => {
          onOpenOrders?.()
          onClose()
        },
      }
    }

    if (notification.type === 'alert') {
      return {
        label: 'Open Messages',
        onClick: () => {
          onOpenMessages?.()
          onClose()
        },
      }
    }

    return null
  }

  useEffect(() => {
    onUnreadChange?.(unreadCount)
  }, [unreadCount, onUnreadChange])

  useEffect(() => {
    if (!isOpen) {
      setSelectedNotification(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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
          </div>
        </header>

        {/* Notifications List / Detail */}
        <div className="flex-1 overflow-auto p-4">
          {selectedNotificationDetails ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedNotification(null)}
                className="inline-flex items-center gap-2 text-sm text-primary font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to notifications
              </button>

              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${getIconStyle(selectedNotificationDetails.type)}`}>
                    {getIcon(selectedNotificationDetails.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground leading-tight">
                      {selectedNotificationDetails.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex rounded-full bg-secondary px-2 py-1 font-medium capitalize text-foreground">
                        {selectedNotificationDetails.type}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedNotificationDetails.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/40 border border-border p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedNotificationDetails.message}
                  </p>
                </div>

                {selectedNotificationDetails.createdAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Received: {new Date(selectedNotificationDetails.createdAt).toLocaleString('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}

                {getPrimaryAction(selectedNotificationDetails) && (
                  <button
                    onClick={getPrimaryAction(selectedNotificationDetails)?.onClick}
                    className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {getPrimaryAction(selectedNotificationDetails)?.label}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {(['all', 'order', 'system', 'alert', 'report'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${activeFilter === filter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {filteredNotifications.length === 0 ? (
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
                  {filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => openNotificationDetail(notification)}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
