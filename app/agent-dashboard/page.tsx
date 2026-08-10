"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AgentDashboard } from "@/components/agent-dashboard"
import { useRole } from "@/lib/role-context"

export default function AgentDashboardPage() {
  const router = useRouter()
  const { role, isLoading } = useRole()

  useEffect(() => {
    if (!isLoading && role !== "agent") {
      router.replace("/")
    }
  }, [isLoading, role, router])

  if (isLoading || role !== "agent") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return <AgentDashboard />
}
