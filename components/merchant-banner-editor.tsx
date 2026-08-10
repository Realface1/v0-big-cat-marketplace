'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Upload, ChevronDown, Eye, Check } from 'lucide-react'
import { validateBannerImageUrl, type WebsiteBannerConfig } from '@/lib/merchant-website'

interface Product {
  id: string
  name: string
  image_url?: string | null
}

interface MerchantBannerEditorProps {
  banner: WebsiteBannerConfig
  onUpdate: (banner: WebsiteBannerConfig) => void
  merchantId?: string
  isLoading?: boolean
}

export function MerchantBannerEditor({
  banner,
  onUpdate,
  merchantId,
  isLoading = false,
}: MerchantBannerEditorProps) {
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [imageUrl, setImageUrl] = useState(banner.productImageUrl || '')
  const [layoutChoice, setLayoutChoice] = useState<'left' | 'right' | 'full-bleed'>(banner.productImageLayout || 'right')
  const [showPreview, setShowPreview] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    setImageUrl(banner.productImageUrl || '')
    setLayoutChoice(banner.productImageLayout || 'right')
  }, [banner.productImageUrl, banner.productImageLayout])

  // Fetch merchant's products when component mounts
  useEffect(() => {
    if (!merchantId) return
    const fetchProducts = async () => {
      setLoadingProducts(true)
      try {
        const response = await fetch(`/api/products/merchant?merchantId=${encodeURIComponent(merchantId)}`)
        if (response.ok) {
          const data = (await response.json()) as { data?: Product[]; products?: Product[] }
          setProducts(data.data || data.products || [])
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [merchantId])

  const handleProductSelect = (productId: string, productImage?: string | null) => {
    const selectedProduct = products.find((p) => p.id === productId)
    if (selectedProduct) {
      const finalImage = productImage || selectedProduct.image_url || ''
      setImageUrl(String(finalImage))
      onUpdate({
        ...banner,
        productImageUrl: String(finalImage),
        promotedProductId: productId,
        productImageLayout: layoutChoice,
      })
      setShowProductPicker(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')

    // Client-side validation
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Only JPEG, PNG, WebP, and GIF images allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')

      const data = (await response.json()) as { url?: string }
      if (data.url && validateBannerImageUrl(data.url)) {
        setImageUrl(data.url)
        onUpdate({
          ...banner,
          productImageUrl: data.url,
          productImageLayout: layoutChoice,
        })
      } else {
        setUploadError('Invalid image URL returned.')
      }
    } catch (err) {
      setUploadError('Upload failed. Please try again.')
      console.error(err)
    }
  }

  const handleLayoutChange = (layout: 'left' | 'right' | 'full-bleed') => {
    setLayoutChoice(layout)
    onUpdate({
      ...banner,
      productImageLayout: layout,
      productImageUrl: imageUrl,
    })
  }

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 p-6 bg-white">
      <div>
        <h3 className="font-semibold text-gray-900">Banner Product Image</h3>
        <p className="text-sm text-gray-600 mt-1">
          Add a product image to make your banner more visually appealing. Choose from your catalog or upload a custom image.
        </p>
      </div>

      {/* Current image display */}
      {imageUrl && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <Image
            src={imageUrl}
            alt="Banner preview"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
          <button
            onClick={() => {
              setImageUrl('')
              onUpdate({ ...banner, productImageUrl: undefined, promotedProductId: undefined })
            }}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold"
          >
            Remove
          </button>
        </div>
      )}

      {/* Product picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select from your products</label>
        <button
          onClick={() => setShowProductPicker(!showProductPicker)}
          disabled={products.length === 0 || loadingProducts || isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium text-sm flex items-center justify-between hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{products.length === 0 ? 'No products available' : 'Choose a product'}</span>
          <span>{loadingProducts ? 'Loading products...' : products.length === 0 ? 'No products available' : 'Choose a product'}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showProductPicker && products.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow-sm">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductSelect(product.id, product.image_url)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 group"
              >
                {product.image_url && (
                  <div className="relative w-10 h-10 rounded overflow-hidden">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                </div>
                <Check className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Or upload a custom image</label>
        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 group">
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
            <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-700">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, GIF up to 5MB</p>
          </div>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isLoading} />
        </label>
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>

      {/* Image layout selection */}
      {imageUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Image layout</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'left' as const, label: 'Image Left', description: 'Image on left side' },
              { value: 'right' as const, label: 'Image Right', description: 'Image on right side' },
              { value: 'full-bleed' as const, label: 'Full Bleed', description: 'Image as background' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleLayoutChange(option.value)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  layoutChoice === option.value
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-600 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview button */}
      {imageUrl && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm hover:bg-emerald-100"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      )}

      {/* Live preview */}
      {showPreview && imageUrl && (
        <div className="rounded-lg overflow-hidden border-2 border-emerald-200 bg-gray-50">
          <div className="aspect-video bg-gradient-to-r from-emerald-600 via-green-600 to-lime-500 relative overflow-hidden">
            {layoutChoice === 'full-bleed' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20" />
              </>
            )}

            <div className="relative h-full flex items-center px-8 text-white">
              <div className={layoutChoice === 'full-bleed' ? 'max-w-2xl' : 'flex-1 max-w-2xl'}>
                <div className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-white mb-3">
                  {banner.badge || 'Featured Product'}
                </div>
                <h2 className="text-3xl font-bold leading-tight">{banner.headline}</h2>
                <p className="mt-2 text-sm text-white/85">{banner.subheadline}</p>
                <button className="mt-4 px-5 py-2 rounded-lg bg-white text-emerald-700 font-semibold text-sm">
                  {banner.ctaText}
                </button>
              </div>

              {(layoutChoice === 'left' || layoutChoice === 'right') && (
                <div className="hidden md:block w-80 h-80 rounded-lg overflow-hidden bg-white/10 ml-4 flex-shrink-0">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
