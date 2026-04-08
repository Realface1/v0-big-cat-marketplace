-- Add columns to merchant_profiles for business setup
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Create index for setup status
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_setup_completed ON merchant_profiles(setup_completed);
