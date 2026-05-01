import { NextRequest, NextResponse } from "next/server"
import { getProductReviews, createReview, canUserReview } from "@/lib/review-actions"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 })
    }

    const result = await getProductReviews(productId)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const reviews = Array.isArray(result.data) ? result.data : []
    const totalReviews = reviews.length
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / totalReviews
        : 0

    return NextResponse.json({
      success: true,
      data: reviews.map((r: any) => ({
        ...r,
        user_name: r.auth_users?.name || r.user_name || null,
      })),
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    })
  } catch (error) {
    console.error("Reviews GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id
    const { userId, rating, comment } = await request.json()

    if (!productId || !userId || !rating || !comment) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return auth.response

    const result = await createReview(productId, userId, Number(rating), String(comment))
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Reviews POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
