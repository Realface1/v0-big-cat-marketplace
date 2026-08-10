"use client"

import { useState, useEffect } from "react"
import { Store, MapPin, Tag, Share2, Edit2, UserPlus, UserCheck, Loader2, Users } from "lucide-react"

interface MerchantProfile {
  id: string
  user_id: string
  business_name: string | null
  business_description: string | null
  category: string | null
  location: string | null
  logo_url: string | null
  smedan_id: string
  setup_completed: boolean
  merchant_type?: 'products' | 'services'
}

interface MiniWebsiteProfileProps {
  profile: MerchantProfile
  isOwner?: boolean
  buyerId?: string
  onEdit?: () => void
}

export function MiniWebsiteProfile({ profile, isOwner = false, buyerId, onEdit }: MiniWebsiteProfileProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [followNotice, setFollowNotice] = useState("")

  useEffect(() => {
    const merchantId = String(profile?.user_id || profile?.id || '').trim()
    if (!merchantId) return
    const buyerQuery = buyerId ? `&buyerId=${encodeURIComponent(buyerId)}` : ''
    fetch(`/api/merchant/follow?merchantId=${encodeURIComponent(merchantId)}${buyerQuery}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((result) => {
        if (result?.success && result?.data) {
          setIsFollowing(Boolean(result.data.isFollowing))
          setFollowerCount(Number(result.data.followerCount || 0))
        }
      })
      .catch(() => null)
  }, [profile?.user_id, profile?.id, buyerId])

  const handleToggleFollow = async () => {
    if (!buyerId) {
      setFollowNotice('Please sign in as a buyer to follow this merchant.')
      setTimeout(() => setFollowNotice(''), 3000)
      return
    }
    const merchantId = String(profile?.user_id || profile?.id || '').trim()
    if (!merchantId) return
    setFollowLoading(true)
    try {
      const response = await fetch(`/api/merchant/follow?merchantId=${encodeURIComponent(merchantId)}&buyerId=${encodeURIComponent(buyerId)}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId, merchantId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!result?.success) {
        setFollowNotice(String(result?.error || 'Could not update follow status right now.'))
        setTimeout(() => setFollowNotice(''), 3000)
        return
      }
      setIsFollowing(Boolean(result?.data?.isFollowing))
      setFollowerCount(Number(result?.data?.followerCount || 0))
      setFollowNotice(isFollowing ? 'You unfollowed this store.' : 'You are now following this store!')
      setTimeout(() => setFollowNotice(''), 3000)
    } catch {
      setFollowNotice('Could not update follow status right now.')
      setTimeout(() => setFollowNotice(''), 3000)
    } finally {
      setFollowLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header with Cover */}
      <div className="relative h-40 md:h-48 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="absolute inset-0 opacity-10 bg-pattern" />
      </div>

      {/* Main Content */}
      <main className="px-4 pb-12 -mt-20 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border/50 p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo Section */}
              <div className="flex flex-col items-center md:items-start">
                {profile.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.business_name || "Business logo"}
                    className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-card"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-card shadow-lg">
                    <Store className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                      {profile.business_name || "Your Business"}
                    </h1>
                    {profile.category && (
                      <div className="flex items-center gap-2 mt-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">{profile.category}</span>
                      </div>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      onClick={onEdit}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      aria-label="Edit profile"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Location */}
                {profile.location && (
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-foreground font-medium">{profile.location}</span>
                  </div>
                )}

                {/* SMEDAN ID Badge */}
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
                  SMEDAN {profile.smedan_id}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 items-center">
                  {!isOwner && (
                    <button
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        isFollowing
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                      }`}
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFollowing ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      window.location.href = `mailto:support@bigcat.ng?subject=Inquiry%20for%20${encodeURIComponent(profile.business_name || 'store')}`
                    }}
                    className={`${isOwner ? 'flex-1' : ''} py-2 px-4 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2`}
                  >
                    <span>Contact Store</span>
                  </button>
                  <button
                    onClick={async () => {
                      const shareData = {
                        title: profile.business_name || 'Store',
                        text: `Check out ${profile.business_name || 'this store'} on BigCat Marketplace`,
                        url: window.location.href,
                      }
                      if (navigator.share) {
                        await navigator.share(shareData)
                      } else {
                        await navigator.clipboard.writeText(window.location.href)
                        alert('Store link copied to clipboard.')
                      }
                    }}
                    className="px-4 py-2 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
                {/* Follower count + notice */}
                <div className="mt-3 flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {followerCount.toLocaleString('en-NG')} follower{followerCount === 1 ? '' : 's'}
                  </span>
                  {followNotice && (
                    <p className="text-xs text-primary font-medium">{followNotice}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 h-px bg-border" />

            {/* Description Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">About This Store</h2>
              <p className="text-foreground/80 leading-relaxed text-pretty">
                {profile.business_description || "No description provided yet."}
              </p>
            </div>
          </div>

          {/* Products and Services Section */}
          <div className="space-y-8">
            {profile.merchant_type !== 'services' && (
              <>
              {/* Featured Products Section */}
              <div className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border/50 p-6 md:p-8">
                <h2 className="text-xl font-semibold text-foreground mb-6">Products</h2>
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                  <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No products published yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Live products will appear here when the merchant adds them.</p>
                </div>
                {isOwner && (
                  <button
                    onClick={onEdit}
                    className="w-full mt-6 py-2 px-4 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors font-medium"
                  >
                    Add Products
                  </button>
                )}
              </div>
              </>
            )}

            {profile.merchant_type !== 'products' && (
              <>
              {/* Featured Services Section */}
              <div className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border/50 p-6 md:p-8">
                <h2 className="text-xl font-semibold text-foreground mb-6">Services</h2>
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                  <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No services published yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Live services will appear here when the merchant adds them.</p>
                </div>
                {isOwner && (
                  <button
                    onClick={onEdit}
                    className="w-full mt-6 py-2 px-4 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors font-medium"
                  >
                    Add Services
                  </button>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
