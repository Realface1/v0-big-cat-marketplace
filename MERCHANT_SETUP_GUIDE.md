# Merchant Setup & Mini Website Guide

## Overview
After merchants create their account via the signup flow, they're automatically redirected to a "Mini Website Setup" page to complete their business profile. Once completed, they see their personalized mini website profile before accessing the full merchant dashboard.

## Database Schema

### merchant_profiles Table Updates
The merchant setup requires the following fields in the `merchant_profiles` table:

```sql
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;
```

**Steps to Execute Migration in Supabase:**
1. Go to your Supabase dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Run the script from `scripts/002-add-merchant-setup-fields.sql`

## Components

### 1. MerchantSetup Component (`components/merchant-setup.tsx`)
**Purpose:** Collects merchant business information during onboarding

**Features:**
- Logo upload with preview
- Business name field
- Category dropdown (11 categories)
- Location field
- Business description textarea (1000 char limit)
- Form validation
- Success confirmation with auto-redirect

**Props:**
```tsx
interface MerchantSetupProps {
  merchantId: string        // Merchant profile ID
  onComplete: () => void    // Callback when setup is done
}
```

**Validation Rules:**
- Business Name: 2-100 characters
- Description: 10-1000 characters
- Category: Must be from predefined list
- Location: 2-100 characters
- Logo: Image file, max 5MB

### 2. MiniWebsiteProfile Component (`components/mini-website-profile.tsx`)
**Purpose:** Displays merchant's public storefront profile

**Features:**
- Logo and business info display
- Category and location badges
- SMEDAN ID badge
- Contact button
- Share functionality
- Featured products section (placeholder)
- Edit button (if owner)

**Props:**
```tsx
interface MiniWebsiteProfileProps {
  profile: MerchantProfile  // Merchant profile data
  isOwner?: boolean         // Show edit button if true
  onEdit?: () => void       // Callback for edit button
}
```

## Server Actions (`lib/merchant-setup-actions.ts`)

### saveMerchantSetup()
Saves merchant setup data to the database.

```typescript
async function saveMerchantSetup(
  merchantId: string,
  setupData: {
    businessName: string
    businessDescription: string
    category: string
    location: string
    logoUrl?: string
  }
): Promise<SetupResponse>
```

**Returns:**
```typescript
{
  success: boolean
  error?: string
  data?: MerchantProfile  // Updated profile
}
```

### getMerchantProfile()
Retrieves merchant profile data.

```typescript
async function getMerchantProfile(
  merchantId: string
): Promise<SetupResponse>
```

**Returns merchant profile with all setup information.**

## Flow Diagram

```
Merchant Signup (merchant-auth.tsx)
         ↓
merchantSignup() creates auth_users & merchant_profiles
         ↓
RoleContext updated with merchant role
         ↓
MarketplaceApp detects merchant role + no setup_completed
         ↓
MerchantSetup component renders
         ↓
Merchant fills form → saveMerchantSetup() called
         ↓
setup_completed flag set to TRUE
         ↓
MiniWebsiteProfile displays their storefront
         ↓
User can click "View Dashboard" → MerchantDashboard
```

## Integration Points

### 1. Merchant Authentication (`components/merchant-auth.tsx`)
- On signup success, merchant is routed through marketplace-app
- RoleContext stores merchant profile data
- Marketplace app checks setup_completed flag

### 2. Marketplace App (`components/marketplace-app.tsx`)
- Checks if merchant has completed setup
- Routes to MerchantSetup if not done
- Shows MiniWebsiteProfile on completion
- Then allows access to MerchantDashboard

### 3. Role Context (`lib/role-context.tsx`)
- Stores merchantProfile data in user object
- Persists to localStorage for session management

## Categories Available
- Electronics
- Fashion
- Home & Garden
- Sports & Outdoors
- Books & Media
- Toys & Games
- Food & Beverages
- Health & Beauty
- Automotive
- Office Supplies
- Other

## Future Enhancements

1. **Logo Upload to Vercel Blob**
   - Currently uses base64 preview
   - Can integrate Vercel Blob for production file storage
   - Add blob upload function in merchant-setup-actions.ts

2. **Profile Editing**
   - Add edit form to update merchant info
   - Accessible from MiniWebsiteProfile edit button
   - Update saveMerchantSetup to handle both create and update

3. **Product Management**
   - Create products_table schema
   - Link products to merchant_id
   - Display in mini website featured section

4. **Store Customization**
   - Theme selection
   - Custom color scheme
   - Banner/header image upload

5. **SEO & Public URL**
   - Generate unique store URLs (e.g., /store/:merchant-slug)
   - Optimize for search engines
   - Public mini website accessible without auth

## Testing Checklist

- [ ] Create new merchant account
- [ ] Verify redirected to MerchantSetup page
- [ ] Upload logo successfully
- [ ] Fill all required fields
- [ ] Test form validation (empty fields, long text)
- [ ] Submit setup form
- [ ] See success message and redirect
- [ ] Verify MiniWebsiteProfile displays correct data
- [ ] Check database has setup_completed = true
- [ ] Logout and login again - should show dashboard directly (no setup page)
- [ ] Click edit button on mini website
- [ ] Navigate to merchant dashboard

## Troubleshooting

**Issue: Database migration fails**
- Solution: Run SQL directly in Supabase SQL editor
- Ensure you're connected to correct database

**Issue: Logo not displaying**
- Solution: Logo stored as base64 in database
- In production, use Vercel Blob for image storage
- Check logo_url field is populated

**Issue: Setup page not showing**
- Solution: Check merchantProfile.setup_completed flag in localStorage
- Verify merchant_profiles table has the new columns
- Check browser console for errors

**Issue: Form validation not working**
- Solution: Ensure all validation rules in merchant-setup-actions.ts are met
- Check console for specific validation error message

## Related Files
- `/lib/merchant-setup-actions.ts` - Server actions for setup
- `/components/merchant-setup.tsx` - Setup form component
- `/components/mini-website-profile.tsx` - Profile display component
- `/components/marketplace-app.tsx` - Flow orchestration
- `/lib/role-context.tsx` - Session management
- `/scripts/002-add-merchant-setup-fields.sql` - Database migration
