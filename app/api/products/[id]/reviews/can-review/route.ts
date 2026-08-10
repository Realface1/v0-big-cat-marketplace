import { NextRequest, NextResponse } from "next/server"
import { canUserReview } from "@/lib/review-actions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || ""

    if (!productId || !userId) {
      return NextResponse.json({ canReview: false, hasReviewed: false })
    }

    const result = await canUserReview(productId, userId)
    const hasReviewed = result.success && !result.canReview
    return NextResponse.json({
      canReview: result.success ? Boolean(result.canReview) : false,
      hasReviewed,
    })
  } catch (error) {
    return NextResponse.json({ canReview: false, hasReviewed: false })
  }
}
