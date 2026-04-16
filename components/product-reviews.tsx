"use client"

import { useState, useEffect } from "react"
import { Star, CheckCircle2, Loader2, Send } from "lucide-react"
import { getProductReviews, createReview, canUserReview, type Review } from "@/lib/review-actions"
import { useRole } from "@/lib/role-context"

interface ProductReviewsProps {
  productId: string
  productName: string
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useRole()
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [canReview, setCanReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [orderId, setOrderId] = useState<string>()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState("")

  useEffect(() => {
    loadReviews()
    if (user?.userId) {
      checkCanReview()
    }
  }, [productId, user])

  const loadReviews = async () => {
    setLoading(true)
    const result = await getProductReviews(productId)
    if (result.success) {
      setReviews(result.reviews || [])
      setAverageRating(result.averageRating || 0)
      setTotalReviews(result.totalReviews || 0)
    }
    setLoading(false)
  }

  const checkCanReview = async () => {
    if (!user?.userId) return
    const result = await canUserReview(user.userId, productId)
    setCanReview(result.canReview)
    setHasReviewed(result.hasReviewed)
    setOrderId(result.orderId)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.userId || !newComment.trim()) return

    setSubmitting(true)
    const result = await createReview({
      productId,
      userId: user.userId,
      orderId,
      rating: newRating,
      comment: newComment.trim(),
    })

    if (result.success) {
      setShowReviewForm(false)
      setNewRating(5)
      setNewComment("")
      loadReviews()
      setCanReview(false)
      setHasReviewed(true)
    }
    setSubmitting(false)
  }

  const renderStars = (rating: number, interactive = false, size = "w-4 h-4") => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => setNewRating(star) : undefined}
            disabled={!interactive}
            className={interactive ? "cursor-pointer" : "cursor-default"}
          >
            <Star
              className={`${size} ${
                star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted"
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-foreground">
                {averageRating.toFixed(1)}
              </span>
              {renderStars(Math.round(averageRating), false, "w-5 h-5")}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>
          
          {canReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Write a Review
            </button>
          )}
          
          {hasReviewed && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              You reviewed this
            </span>
          )}
        </div>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <form onSubmit={handleSubmitReview} className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Review {productName}</h3>
          
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Your Rating</label>
            {renderStars(newRating, true, "w-8 h-8")}
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Your Review</label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your experience with this product..."
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="flex-1 py-2.5 border border-border rounded-lg text-foreground font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to review this product!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {review.user?.name || "Anonymous"}
                    </span>
                    {review.verified_purchase && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(review.rating)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Star Rating Display Component for use in other components
export function StarRating({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
      {reviews !== undefined && (
        <span className="text-xs text-muted-foreground">({reviews})</span>
      )}
    </div>
  )
}
