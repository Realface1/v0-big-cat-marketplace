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
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { role } = useRole()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // TODO: Fetch real notifications from database
    // For now, show empty notifications
    setNotifications([])
    
    // Only show welcome notification for new users
    if (role === "buyer" || role === "merchant") {
      // Check if they've seen the welcome notification before
      const hasSeenWelcome = localStorage.getItem(`welcome_notification_${role}`)
      if (!hasSeenWelcome) {
        setNotifications([
          {
            id: "welcome",
            type: "system",
            title: `Welcome to BigCat!`,
            message: role === "buyer" 
              ? "Start exploring our marketplace for amazing deals."
              : "Set up your store and start selling today.",
            time: "Just now",
            read: false,
          },
        ])
        localStorage.setItem(`welcome_notification_${role}`, "true")
      }
    }
    
    /* Future: Replace with real notification fetch
    if (role === "buyer") {
      setNotifications([
        {
          id: "1",
          type: "order",
          title: "Order Confirmed",
          message: "Your order has been confirmed and is being processed.",
          time: "Just now",
          read: false,
        },
      ])
    } else if (role === "merchant") {
      setNotifications([
        {
          id: "3",
          type: "system",
          title: "Store Approved",
          message: "Your store has been approved! Start adding products.",
          time: "2 days ago",
          read: true,
        },
      ])
    } else if (role === "admin") {
      setNotifications([
        {
          id: "1",
          type: "warning",
          title: "Pending Approval",
          message: "3 merchants are waiting for approval.",
          time: "Just now",
          read: false,
        },
        {
          id: "2",
          type: "system",
          title: "Platform Update",
          message: "System maintenance completed successfully.",
          time: "3 hours ago",
          read: true,
        },
      ])
    }
    */
  }, [role])

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
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

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
