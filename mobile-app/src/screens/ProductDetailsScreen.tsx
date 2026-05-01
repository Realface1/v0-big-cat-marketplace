import { useEffect, useState, useCallback } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { BrandWordmark } from "../components/BrandWordmark"
import { useCart } from "../context/cart-context"
import { useWishlist } from "../context/wishlist-context"
import { useAuth } from "../context/auth-context"
import {
  fetchMarketplaceProductById,
  fetchProductReviews,
  submitReview,
  checkCanReview,
  type Review,
} from "../lib/api"
import { formatNaira } from "../lib/currency"
import type { RootStackParamList } from "../navigation/types"
import { colors } from "../theme"

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetails">

function StarRating({ rating, size = 14, interactive = false, onRate }: { rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRate?.(star)} disabled={!interactive}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#f59e0b" : colors.mutedText}
          />
        </Pressable>
      ))}
    </View>
  )
}

export function ProductDetailsScreen({ route, navigation }: Props) {
  const { productId, product: initialProduct } = route.params
  const { addItem, getItemCount } = useCart()
  const { isWishlisted, toggleItem: toggleWishlist } = useWishlist()
  const { user } = useAuth()

  const [loading, setLoading] = useState(!initialProduct)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState(initialProduct ?? null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState("")

  const cartCount = getItemCount()
  const images = product?.images?.length ? product.images : product?.image_url ? [product.image_url] : []
  const stock = Math.max(0, Number(product?.stock || 0))
  const outOfStock = stock <= 0
  const wishlisted = product ? isWishlisted(product.id) : false

  useEffect(() => {
    async function loadProduct() {
      if (initialProduct) return

      setLoading(true)
      try {
        const loadedProduct = await fetchMarketplaceProductById(productId)
        setProduct(loadedProduct)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load product"
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [initialProduct, productId])

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const result = await fetchProductReviews(productId)
      setReviews(result.reviews)
      setAverageRating(result.averageRating)
      setTotalReviews(result.totalReviews)
    } catch {}
    setReviewsLoading(false)
  }, [productId])

  useEffect(() => { loadReviews() }, [loadReviews])

  useEffect(() => {
    if (!user?.id) return
    checkCanReview(productId, user.id).then((result) => {
      setCanReview(result.canReview)
      setHasReviewed(result.hasReviewed)
    }).catch(() => {})
  }, [productId, user?.id])

  const handleSubmitReview = async () => {
    if (!user?.id || !newComment.trim()) return
    setSubmittingReview(true)
    setReviewError("")
    try {
      await submitReview(productId, user.id, newRating, newComment.trim())
      setShowReviewForm(false)
      setNewComment("")
      setNewRating(5)
      setCanReview(false)
      setHasReviewed(true)
      await loadReviews()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to submit review")
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleWishlist = () => {
    if (!product) return
    toggleWishlist({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
      merchantName: product.merchant_profiles?.business_name,
      category: product.category,
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <Text style={styles.errorTitle}>Unable to load this product</Text>
          <Text style={styles.stateText}>{error || "The product is no longer available."}</Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.mutedText} />
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>
        <BrandWordmark compact />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={handleWishlist} style={styles.cartHeaderChip}>
            <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={16} color={wishlisted ? colors.error : colors.text} />
          </Pressable>
          <View style={styles.cartHeaderChip}>
            <Ionicons name="cart-outline" size={16} color={colors.text} />
            <Text style={styles.cartHeaderChipText}>{cartCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {images.length > 0 ? (
          <View style={styles.galleryWrap}>
            <Image source={{ uri: images[currentImageIndex] }} style={styles.heroImage} resizeMode="cover" />
            {images.length > 1 ? (
              <>
                <Pressable
                  style={[styles.navArrow, styles.navArrowLeft]}
                  onPress={() => setCurrentImageIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1))}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  style={[styles.navArrow, styles.navArrowRight]}
                  onPress={() => setCurrentImageIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1))}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </Pressable>
              </>
            ) : null}
          </View>
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={42} color={colors.mutedText} />
            <Text style={styles.imageFallbackText}>No image available</Text>
          </View>
        )}

        <View style={styles.detailsCard}>
          <Text style={styles.categoryChip}>{product.category || "General"}</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>{formatNaira(product.price)}</Text>
          <Text style={styles.merchantName}>Sold by {product.merchant_profiles?.business_name || "Merchant"}</Text>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description || "No product description provided yet."}</Text>

          <View style={styles.infoCard}>
            <Text style={[styles.stockText, outOfStock ? styles.stockDanger : stock <= 5 ? styles.stockWarning : styles.stockGood]}>
              {outOfStock ? "Out of stock" : `${stock} item${stock > 1 ? "s" : ""} available`}
            </Text>
            {Number.isFinite(Number(product?.merchant_profiles?.distance_km)) ? (
              <Text style={styles.distanceText}>{Number(product.merchant_profiles?.distance_km).toFixed(1)} km away</Text>
            ) : null}
          </View>

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <Pressable style={styles.qtyButton} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Ionicons name="remove" size={16} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable
                style={styles.qtyButton}
                onPress={() => setQuantity((q) => Math.min(Math.max(1, stock || 1), q + 1))}
                disabled={outOfStock}
              >
                <Ionicons name="add" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, outOfStock ? styles.primaryButtonDisabled : null]}
            disabled={outOfStock}
            onPress={() =>
              addItem({
                id: product.id,
                productId: product.id,
                name: product.name,
                price: Number(product.price || 0),
                quantity,
                merchantId: String(product.merchant_id || product.merchant_profiles?.id || "merchant"),
                merchantName: product.merchant_profiles?.business_name || "Merchant",
                imageUrl: product.image_url,
              })
            }
          >
            <Text style={styles.primaryButtonText}>{outOfStock ? "Out of stock" : "Add to cart"}</Text>
          </Pressable>
        </View>

        {/* Reviews section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {totalReviews > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingText}>{averageRating.toFixed(1)} ({totalReviews})</Text>
              </View>
            )}
          </View>

          {canReview && !showReviewForm && !hasReviewed && (
            <Pressable style={styles.writeReviewBtn} onPress={() => setShowReviewForm(true)}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.writeReviewText}>Write a review</Text>
            </Pressable>
          )}

          {hasReviewed && !showReviewForm && (
            <View style={styles.reviewedBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={styles.reviewedText}>You've reviewed this product</Text>
            </View>
          )}

          {showReviewForm && (
            <View style={styles.reviewForm}>
              <Text style={styles.formLabel}>Your Rating</Text>
              <StarRating rating={newRating} size={24} interactive onRate={setNewRating} />
              <Text style={[styles.formLabel, { marginTop: 12 }]}>Comment</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience with this product..."
                placeholderTextColor={colors.mutedText}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                numberOfLines={3}
              />
              {reviewError ? <Text style={styles.reviewErrorText}>{reviewError}</Text> : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable
                  style={styles.cancelReviewBtn}
                  onPress={() => { setShowReviewForm(false); setReviewError("") }}
                >
                  <Text style={styles.cancelReviewText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitReviewBtn, submittingReview && styles.submitReviewBtnDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitReviewText}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {reviewsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <Text style={styles.reviewerName}>{review.user_name || "Customer"}</Text>
                  <StarRating rating={review.rating} size={12} />
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLinkText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "600",
  },
  cartHeaderChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  cartHeaderChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  galleryWrap: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 260,
    backgroundColor: colors.secondary,
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  imageFallback: {
    width: "100%",
    height: 260,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageFallbackText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  detailsCard: {
    margin: 16,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  productName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  productPrice: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  categoryChip: {
    alignSelf: "flex-start",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  merchantName: {
    color: colors.mutedText,
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: 8,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "700",
  },
  stockGood: {
    color: colors.primary,
  },
  stockWarning: {
    color: colors.warning,
  },
  stockDanger: {
    color: colors.error,
  },
  distanceText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    width: 24,
    textAlign: "center",
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontWeight: "700",
    fontSize: 15,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.mutedText,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  stateText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: "center",
  },
  errorTitle: {
    color: colors.error,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  reviewsSection: {
    margin: 16,
    marginTop: 0,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: "flex-start",
  },
  writeReviewText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  reviewedBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewedText: { fontSize: 13, color: colors.success },
  reviewForm: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  formLabel: { fontSize: 13, color: colors.mutedText, marginBottom: 6 },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
    textAlignVertical: "top",
    minHeight: 70,
  },
  reviewErrorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  cancelReviewBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelReviewText: { fontSize: 13, color: colors.text },
  submitReviewBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitReviewBtnDisabled: { opacity: 0.7 },
  submitReviewText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  noReviewsText: { fontSize: 13, color: colors.mutedText, textAlign: "center", paddingVertical: 12 },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 8,
  },
  reviewTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: "600", color: colors.text },
  reviewComment: { fontSize: 13, color: colors.text, lineHeight: 18 },
  reviewDate: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
})
