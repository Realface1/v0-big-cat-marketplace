"use client"

import { Store, MapPin, Tag, Share2, Edit2 } from "lucide-react"

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
}

interface MiniWebsiteProfileProps {
  profile: MerchantProfile
  isOwner?: boolean
  onEdit?: () => void
}

export function MiniWebsiteProfile({ profile, isOwner = false, onEdit }: MiniWebsiteProfileProps) {
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
                <div className="flex gap-3">
                  <button className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2">
                    <span>Contact Store</span>
                  </button>
                  <button className="px-4 py-2 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
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

          {/* Featured Products Section */}
          <div className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border/50 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Featured Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-xl bg-secondary/50 border border-border/50 p-4 text-center">
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3">
                    <Store className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              ))}
            </div>
            {isOwner && (
              <button className="w-full mt-6 py-2 px-4 bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors font-medium">
                Add Products
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
