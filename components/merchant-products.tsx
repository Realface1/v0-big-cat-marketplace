'use client'

import { useState, useEffect } from 'react'
import { formatNaira } from '@/lib/currency-utils'
import { Plus, Trash2, AlertCircle, Package, Loader2, X, Check, ImageIcon } from 'lucide-react'
import { ImageUpload } from './image-upload'
import Image from 'next/image'

interface MerchantProductsProps {
  merchantId: string
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Food & Beverages',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Beauty & Personal Care',
  'Toys & Games',
  'Automotive',
  'Health & Wellness',
  'Other'
]

export function MerchantProducts({ merchantId }: MerchantProductsProps) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    category: 'Electronics',
    stock: '0',
    weight: '',
    images: [] as string[],
  })

  // Fetch products on mount
  useEffect(() => {
    loadProducts()
  }, [merchantId])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/merchant?merchantId=${merchantId}&includePrivate=1`)
      const result = await response.json()
      if (result.success) {
        setProducts(result.data)
      } else {
        setError(result.error || 'Failed to load products')
      }
    } catch (error) {
      setError('Failed to load products')
    }
    setLoading(false)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Product name is required')
      return
    }

    if (!formData.description.trim()) {
      setError('Product description is required')
      return
    }

    if (!formData.price) {
      setError('Product price is required')
      return
    }

    const price = Number.parseFloat(formData.price)
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid selling price greater than 0')
      return
    }

    if (price > 99999999.99) {
      setError('Selling price is too large')
      return
    }

    if (formData.costPrice === '') {
      setError('Cost price is required')
      return
    }

    const costPrice = Number.parseFloat(formData.costPrice)
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setError('Enter a valid cost price')
      return
    }

    if (costPrice > 99999999.99) {
      setError('Cost price is too large')
      return
    }

    const stock = formData.stock === '' ? 0 : Number(formData.stock)
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Enter a valid stock quantity')
      return
    }

    if (stock > 99999999) {
      setError('Stock quantity is too large')
      return
    }

    const weight = formData.weight ? Number.parseFloat(formData.weight) : undefined
    if (formData.weight && (!Number.isFinite(weight) || (weight ?? 0) < 0)) {
      setError('Enter a valid weight')
      return
    }

    if (weight !== undefined && weight > 99999999.99) {
      setError('Product weight is too large')
      return
    }

    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId,
          product: {
            name: formData.name,
            description: formData.description,
            price,
            cost_price: costPrice,
            category: formData.category,
            stock,
            weight,
            images: formData.images,
          }
        }),
      })
      const result = await response.json()

      if (result.success) {
        setSuccess('Product created successfully!')
        setFormData({ name: '', description: '', price: '', costPrice: '', category: 'Electronics', stock: '0', weight: '', images: [] })
        setShowAddForm(false)
        loadProducts()
      } else {
        setError(result.error || 'Failed to create product')
      }
    } catch (error) {
      setError('Failed to create product')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products/delete?productId=${productId}`, {
          method: 'DELETE',
        })
        const result = await response.json()
        if (result.success) {
          setSuccess(result.message || 'Product removed successfully')
          loadProducts()
        } else {
          setError(result.error || 'Failed to delete product')
        }
      } catch (error) {
        setError('Failed to delete product')
      }
    }
  }

  const handleUpdateInventory = async (productId: string, stockValue: number, costPriceValue: number) => {
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setError('Enter a valid stock quantity')
      return
    }

    if (!Number.isFinite(costPriceValue) || costPriceValue < 0) {
      setError('Enter a valid cost price')
      return
    }

    setError('')
    setSuccess('')
    setUpdatingStockId(productId)

    try {
      const response = await fetch('/api/products/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          merchantId,
          updates: {
            stock: stockValue,
            cost_price: costPriceValue,
          },
        }),
      })

      const result = await response.json()
      if (result.success) {
        setSuccess('Inventory details updated successfully!')
        loadProducts()
      } else if (response.status === 401) {
        setError('Your session expired. Please sign in again and retry.')
      } else {
        setError(result.error || 'Failed to update inventory details')
      }
    } catch (error) {
      setError('Failed to update inventory details')
    } finally {
      setUpdatingStockId(null)
    }
  }

  const handleRequestWeightVerification = async (productId: string) => {
    try {
      const response = await fetch('/api/products/weight-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      })
      const result = await response.json()
      if (result.success) {
        setSuccess('Weight verification requested. An agent will update it soon.')
        loadProducts()
      } else {
        setError(result.error || 'Failed to request verification')
      }
    } catch (error) {
      setError('Failed to request verification')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your store inventory</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-primary">{success}</p>
        </div>
      )}

      {/* Add Product Form */}
      {showAddForm && (
        <div className="mx-4 bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Add New Product</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-4">
            {/* Product Images */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Product Images
              </label>
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) => setFormData({ ...formData, images })}
                maxImages={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows={3}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cost Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Selling Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="99999999.99"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="99999999"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Cost price is private to merchants and used only for audit, profit and loss tracking.
            </p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Create Product
            </button>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="px-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-lg p-4 flex items-start gap-4"
              >
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{product.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      Selling: {formatNaira(product.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Cost: {formatNaira(Number(product.cost_price || 0))}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${Number(product.price || 0) >= Number(product.cost_price || 0) ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      Margin: {formatNaira(Number(product.price || 0) - Number(product.cost_price || 0))}
                    </span>
                    <span className="text-xs px-2 py-1 bg-secondary rounded-full text-foreground">
                      {product.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${Number(product.stock || 0) > 5 ? 'bg-primary/10 text-primary' : Number(product.stock || 0) > 0 ? 'bg-chart-4/10 text-chart-4' : 'bg-destructive/10 text-destructive'}`}>
                      {Number(product.stock || 0)} in stock
                    </span>
                    {product.weight && (
                      <span className="text-xs text-muted-foreground">
                        {product.weight}kg
                      </span>
                    )}
                    {product.status === 'pending_weight_verification' && (
                      <span className="text-xs px-2 py-1 bg-chart-4/10 text-chart-4 rounded-full">
                        Pending Weight Verification
                      </span>
                    )}
                    {product.status === 'active' && Number(product.stock || 0) > 0 && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[88px_110px_auto] gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={String(product.stock ?? 0)}
                      onChange={(e) =>
                        setProducts((current) =>
                          current.map((item) =>
                            item.id === product.id
                              ? { ...item, stock: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label={`Stock for ${product.name}`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(product.cost_price ?? 0)}
                      onChange={(e) =>
                        setProducts((current) =>
                          current.map((item) =>
                            item.id === product.id
                              ? { ...item, cost_price: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label={`Cost price for ${product.name}`}
                    />
                    <button
                      onClick={() => handleUpdateInventory(product.id, Number(product.stock || 0), Number(product.cost_price || 0))}
                      disabled={updatingStockId === product.id}
                      className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {updatingStockId === product.id ? 'Saving...' : 'Save audit'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {product.status === 'pending_weight_verification' && (
                      <button
                        onClick={() => handleRequestWeightVerification(product.id)}
                        className="p-2 text-chart-4 hover:bg-chart-4/10 rounded-lg transition-colors"
                        title="Request weight verification from agent"
                      >
                        <AlertCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
