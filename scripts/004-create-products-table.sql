-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT,
  weight DECIMAL(10, 2),
  weight_verified BOOLEAN DEFAULT FALSE,
  weight_verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  images JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending_weight_verification'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Disable RLS for now
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
