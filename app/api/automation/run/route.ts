import { NextRequest, NextResponse } from "next/server"
import {
  runAbandonedCartRecoveryJob,
  runAllAutomationJobs,
  runBizPilotAlertsJob,
  runLowStockAlertJob,
  runUnprocessedOrderReminderJob,
  runWeeklyBusinessReportJob,
} from "@/lib/automation-jobs"

function isAuthorized(request: NextRequest) {
  const manualSupplied = request.headers.get("x-automation-secret") || ""
  const manualExpected = process.env.AUTOMATION_CRON_SECRET || ""

  if (manualExpected && manualSupplied === manualExpected) {
    return true
  }

  const cronSecret = process.env.CRON_SECRET || ""
  const authHeader = request.headers.get("authorization") || ""
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const job = String(searchParams.get("job") || "all").toLowerCase()

    if (job === "order-reminders") {
      return NextResponse.json(await runUnprocessedOrderReminderJob())
    }

    if (job === "bizpilot") {
      return NextResponse.json(await runBizPilotAlertsJob())
    }

    if (job === "low-stock") {
      return NextResponse.json(await runLowStockAlertJob(5))
    }

    if (job === "weekly-report") {
      return NextResponse.json(await runWeeklyBusinessReportJob())
    }

    if (job === "abandoned-cart") {
      return NextResponse.json(await runAbandonedCartRecoveryJob())
    }

    return NextResponse.json(await runAllAutomationJobs())
  } catch (error) {
    console.error("Automation runner API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
