-- Add merchant_type column to merchant_profiles table
-- Values: 'products' or 'services'
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS merchant_type TEXT DEFAULT 'products' CHECK (merchant_type IN ('products', 'services'));

-- Create index for merchant type filtering
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_type ON merchant_profiles(merchant_type);

-- Also add to auth_users for easier filtering
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS merchant_type TEXT CHECK (merchant_type IS NULL OR merchant_type IN ('products', 'services'));

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
