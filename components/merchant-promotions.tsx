'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/lib/role-context'
import {
  Zap,
  Gift,
  Flame,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Tag,
} from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'

type PromotionRuleType = 'standard' | 'spend_x_save_y' | 'buy_x_get_y' | 'nth_item_discount'

interface Promotion {
  id: string
  name: string
  type: 'discount' | 'bundle' | 'flash_sale'
  description?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number
  max_uses?: number
  current_uses: number
  usage_per_buyer: number
  start_date: string
  end_date: string
  is_active: boolean
  product_ids: string[]
  rule_type?: PromotionRuleType
  spend_threshold?: number
  buy_quantity?: number
  get_quantity?: number
  nth_item?: number
  created_at: string
}

interface PromotionAnalyticsOverview {
  promotionsTotal: number
  promotionsActive: number
  couponsTotal: number
  couponsActive: number
  totalPromotionUses: number
  totalCouponUses: number
  totalUses: number
  totalRevenueImpact: number
  topPromotions: Array<{
    id: string
    name: string
    uses: number
    maxUses: number | null
    active: boolean
  }>
}

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number
  max_uses?: number
  current_uses: number
  max_uses_per_buyer: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

interface MerchantProductOption {
  id: string
  name: string
}

type TabType = 'discounts' | 'coupons' | 'analytics'

export function MerchantPromotions() {
  const { user } = useRole()
  const [tab, setTab] = useState<TabType>('discounts')
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [merchantProducts, setMerchantProducts] = useState<MerchantProductOption[]>([])
  const [analytics, setAnalytics] = useState<PromotionAnalyticsOverview | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'discount' as const,
    discount_type: 'percentage' as const,
    discount_value: 10,
    min_purchase_amount: 0,
    max_uses: undefined as number | undefined,
    product_ids: [] as string[],
    rule_type: 'standard' as PromotionRuleType,
    spend_threshold: undefined as number | undefined,
    buy_quantity: undefined as number | undefined,
    get_quantity: undefined as number | undefined,
    nth_item: undefined as number | undefined,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const [couponData, setCouponData] = useState({
    code: '',
    discount_type: 'percentage' as const,
    discount_value: 10,
    min_purchase_amount: 0,
    max_uses: undefined as number | undefined,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    loadData()
  }, [tab, user?.userId])

  useEffect(() => {
    const loadMerchantProducts = async () => {
      if (!user?.userId) return
      try {
        const res = await fetch(`/api/products/merchant?merchantId=${encodeURIComponent(user.userId)}`)
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data?.data)
          ? data.data.map((p: any) => ({ id: String(p.id), name: String(p.name || 'Product') }))
          : []
        setMerchantProducts(items)
      } catch {
        setMerchantProducts([])
      }
    }

    loadMerchantProducts()
  }, [user?.userId])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const headers: Record<string, string> = {}
      if (user?.userId) headers['x-user-id'] = user.userId
      if (tab === 'discounts') {
        const res = await fetch('/api/merchant/promotions', { headers })
        if (!res.ok) throw new Error('Failed to load promotions')
        const data = await res.json()
        setPromotions(data.data || [])
      } else if (tab === 'coupons') {
        const res = await fetch('/api/merchant/coupons', { headers })
        if (!res.ok) throw new Error('Failed to load coupons')
        const data = await res.json()
        setCoupons(data.data || [])
      } else if (tab === 'analytics') {
        const res = await fetch('/api/merchant/promotions/analytics', { headers })
        if (!res.ok) throw new Error('Failed to load analytics')
        const data = await res.json()
        setAnalytics(data.data || null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.userId) {
      setError('Merchant session not found. Please sign in again.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/merchant/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.userId ? { 'x-user-id': user.userId } : {}) },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setPromotions([data.data, ...promotions])
      setShowCreateForm(false)
      setFormData({
        name: '',
        type: 'discount',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: 0,
        max_uses: undefined,
        product_ids: [],
        rule_type: 'standard',
        spend_threshold: undefined,
        buy_quantity: undefined,
        get_quantity: undefined,
        nth_item: undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.userId) {
      setError('Merchant session not found. Please sign in again.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/merchant/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.userId ? { 'x-user-id': user.userId } : {}) },
        body: JSON.stringify({
          action: 'create',
          input: couponData,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setCoupons([data.data, ...coupons])
      setCouponData({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: 0,
        max_uses: undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Delete this promotion?')) return
    if (!user?.userId) {
      setError('Merchant session not found. Please sign in again.')
      return
    }
    try {
      const res = await fetch('/api/merchant/promotions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(user?.userId ? { 'x-user-id': user.userId } : {}) },
        body: JSON.stringify({ promotionId: id }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPromotions(promotions.filter((p) => p.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCoupon(code)
    setTimeout(() => setCopiedCoupon(null), 2000)
  }

  const formatDiscount = (promo: Promotion | Coupon) => {
    if (promo.discount_type === 'percentage') {
      return `${promo.discount_value}% off`
    }
    return `₦${formatNaira(promo.discount_value)}`
  }

  const selectedProductsLabel = (productIds: string[]) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return 'All products'
    const names = merchantProducts
      .filter((p) => productIds.includes(p.id))
      .map((p) => p.name)
    if (names.length === 0) return `${productIds.length} selected product(s)`
    if (names.length <= 2) return names.join(', ')
    return `${names[0]}, ${names[1]} +${names.length - 2} more`
  }

  const promotionRuleLabel = (promo: Promotion) => {
    if (promo.rule_type === 'spend_x_save_y') {
      return `Spend ₦${formatNaira(Number(promo.spend_threshold || 0))}, save ₦${formatNaira(Number(promo.discount_value || 0))}`
    }

    if (promo.rule_type === 'buy_x_get_y') {
      return `Buy ${Number(promo.buy_quantity || 0)}, get ${Number(promo.get_quantity || 0)}`
    }

    if (promo.rule_type === 'nth_item_discount') {
      return `Every ${Number(promo.nth_item || 0)}th item: ${Number(promo.discount_value || 0)}% off`
    }

    return formatDiscount(promo)
  }

  const isActive = (startDate: string, endDate: string) => {
    const now = new Date()
    return new Date(startDate) <= now && now <= new Date(endDate)
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['discounts', 'coupons', 'analytics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'discounts' && '🎯 Discounts'}
            {t === 'coupons' && '🎟️ Coupons'}
            {t === 'analytics' && '📊 Analytics'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Discounts Tab */}
      {tab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5" /> Active Discounts & Promotions
            </h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Promotion
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreatePromotion} className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Promotion name (e.g., Summer Sale)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="discount">Discount</option>
                  <option value="flash_sale">Flash Sale</option>
                  <option value="bundle">Bundle Deal</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_type: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    disabled={formData.rule_type !== 'standard'}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₦)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Discount Value</label>
                  <input
                    type="number"
                    placeholder={formData.discount_type === 'percentage' ? '10' : '1000'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Promotion Rule</label>
                <select
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as PromotionRuleType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                >
                  <option value="standard">Standard Discount</option>
                  <option value="spend_x_save_y">Spend X, Save Y</option>
                  <option value="buy_x_get_y">Buy X, Get Y</option>
                  <option value="nth_item_discount">Nth Item Discount</option>
                </select>
              </div>

              {formData.rule_type === 'spend_x_save_y' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium">Spend Threshold (₦)</label>
                    <input
                      type="number"
                      value={formData.spend_threshold ?? ''}
                      onChange={(e) => setFormData({ ...formData, spend_threshold: Number(e.target.value) || undefined })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Save Amount (₦)</label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              )}

              {formData.rule_type === 'buy_x_get_y' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium">Buy Quantity (X)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.buy_quantity ?? ''}
                      onChange={(e) => setFormData({ ...formData, buy_quantity: Number(e.target.value) || undefined })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Get Quantity (Y)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.get_quantity ?? ''}
                      onChange={(e) => setFormData({ ...formData, get_quantity: Number(e.target.value) || undefined })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              )}

              {formData.rule_type === 'nth_item_discount' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium">Apply To Every Nth Item</label>
                    <input
                      type="number"
                      min={2}
                      value={formData.nth_item ?? ''}
                      onChange={(e) => setFormData({ ...formData, nth_item: Number(e.target.value) || undefined })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nth Item Discount (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Min. Purchase (₦)</label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Apply to products</label>
                <p className="text-xs text-muted-foreground mt-1">Leave all unchecked to apply to every product.</p>
                <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 space-y-2">
                  {merchantProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">No products found yet.</p>
                  ) : (
                    merchantProducts.map((product) => {
                      const checked = formData.product_ids.includes(product.id)
                      return (
                        <label key={product.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, product_ids: [...formData.product_ids, product.id] })
                              } else {
                                setFormData({ ...formData, product_ids: formData.product_ids.filter((id) => id !== product.id) })
                              }
                            }}
                          />
                          <span className="text-sm">{product.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Promotion'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading promotions...</div>
          ) : promotions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No promotions yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-lg border border-border bg-card p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {promo.type === 'discount' && <Tag className="w-4 h-4 text-blue-500" />}
                      {promo.type === 'flash_sale' && <Flame className="w-4 h-4 text-orange-500" />}
                      {promo.type === 'bundle' && <Gift className="w-4 h-4 text-purple-500" />}
                      <h4 className="font-semibold">{promo.name}</h4>
                      {isActive(promo.start_date, promo.end_date) ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Rule</p>
                        <p className="font-semibold">{promotionRuleLabel(promo)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Uses</p>
                        <p className="font-semibold">
                          {promo.current_uses}
                          {promo.max_uses ? `/${promo.max_uses}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="font-semibold text-xs">
                          {new Date(promo.start_date).toLocaleDateString()} -{' '}
                          {new Date(promo.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Min. Purchase</p>
                        <p className="font-semibold">₦{formatNaira(promo.min_purchase_amount)}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Applies to: <span className="font-medium text-foreground">{selectedProductsLabel(promo.product_ids)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button className="p-2 hover:bg-muted rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promo.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coupons Tab */}
      {tab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Tag className="w-5 h-5" /> Coupon Codes
            </h3>
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> New Coupon
              </button>
            ) : null}
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreateCoupon}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Coupon code (e.g., SUMMER20)"
                  value={couponData.code}
                  onChange={(e) =>
                    setCouponData({ ...couponData, code: e.target.value.toUpperCase() })
                  }
                  required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={couponData.discount_type}
                  onChange={(e) =>
                    setCouponData({ ...couponData, discount_type: e.target.value as any })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
                <input
                  type="number"
                  placeholder={couponData.discount_type === 'percentage' ? '20' : '5000'}
                  value={couponData.discount_value}
                  onChange={(e) =>
                    setCouponData({ ...couponData, discount_value: Number(e.target.value) })
                  }
                  required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <input
                    type="date"
                    value={couponData.start_date}
                    onChange={(e) =>
                      setCouponData({ ...couponData, start_date: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">End Date</label>
                  <input
                    type="date"
                    value={couponData.end_date}
                    onChange={(e) =>
                      setCouponData({ ...couponData, end_date: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Coupon'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading coupons...</div>
          ) : coupons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No coupons yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="rounded-lg border border-border bg-card p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-mono bg-muted px-3 py-2 rounded text-sm font-bold">
                        {coupon.code}
                      </div>
                      <div>
                        <p className="font-semibold">{formatDiscount(coupon)} off</p>
                        <p className="text-xs text-muted-foreground">
                          Valid {new Date(coupon.start_date).toLocaleDateString()} -{' '}
                          {new Date(coupon.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      {isActive(coupon.start_date, coupon.end_date) ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(coupon.code)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    {copiedCoupon === coupon.code ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {!analytics ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No analytics data yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Active Promotions</p>
                  <p className="text-2xl font-bold mt-1">{analytics.promotionsActive}/{analytics.promotionsTotal}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Active Coupons</p>
                  <p className="text-2xl font-bold mt-1">{analytics.couponsActive}/{analytics.couponsTotal}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Total Uses</p>
                  <p className="text-2xl font-bold mt-1">{analytics.totalUses}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold mt-1">₦{formatNaira(analytics.totalRevenueImpact)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold mb-3">Top Promotions</h4>
                {analytics.topPromotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No promotion usage yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topPromotions.map((promo) => (
                      <div key={promo.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{promo.name}</p>
                          <p className="text-xs text-muted-foreground">{promo.active ? 'Active' : 'Inactive'}</p>
                        </div>
                        <p className="text-sm font-semibold">
                          {promo.uses}
                          {promo.maxUses ? `/${promo.maxUses}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
