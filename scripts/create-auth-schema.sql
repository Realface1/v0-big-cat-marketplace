-- Create auth_users table
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  cac_id TEXT,
  google_id TEXT,
  city TEXT,
  state TEXT,
  location TEXT,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'merchant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create merchant_profiles table
CREATE TABLE IF NOT EXISTS merchant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  business_name TEXT,
  smedan_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_google_id ON auth_users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_smedan_id ON merchant_profiles(smedan_id);
