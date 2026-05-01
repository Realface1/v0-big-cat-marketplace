'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({ images, onImagesChange, maxImages = 4 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the max
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    setError(null)

    const uploadedUrls: string[] = []

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        const data = await response.json()
        uploadedUrls.push(data.url)
      } catch (err: any) {
        setError(err.message || 'Failed to upload image')
        break
      }
    }

    if (uploadedUrls.length > 0) {
      onImagesChange([...images, ...uploadedUrls])
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index]
    
    // Remove from UI immediately
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)

    // Try to delete from blob storage (don't block on failure)
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      })
    } catch (err) {
      console.error('Failed to delete image from storage:', err)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {images.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border group"
          >
            <Image
              src={url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {index === 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md">
                Main
              </div>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/50 hover:bg-secondary transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {images.length === 0 ? 'Add Photos' : 'Add More'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images. JPEG, PNG, WebP or GIF. Max 5MB each.
      </p>
    </div>
  )
}

// Simple product image display component
interface ProductImageProps {
  src?: string | null
  alt: string
  className?: string
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  if (!src) {
    return (
      <div className={`bg-secondary flex items-center justify-center ${className}`}>
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 33vw"
      />
    </div>
  )
}
