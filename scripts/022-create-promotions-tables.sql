-- Create promotions table for discounts, flash sales, bundles
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('discount', 'bundle', 'flash_sale')),
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER DEFAULT 0,
  usage_per_buyer INTEGER DEFAULT 1,
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- For bundles and flash sales
  is_active BOOLEAN DEFAULT true,
  product_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER DEFAULT 0,
  max_uses_per_buyer INTEGER DEFAULT 1,
  
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track coupon usage per buyer
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  used_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, buyer_id)
);

-- Track promotion performance
CREATE TABLE promotion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  revenue_impact DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promotion_id, date)
);

-- Create indexes
CREATE INDEX idx_promotions_merchant_id ON promotions(merchant_id);
CREATE INDEX idx_promotions_active ON promotions(is_active, end_date);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_merchant_id ON coupons(merchant_id);
CREATE INDEX idx_coupons_active ON coupons(is_active, end_date);
CREATE INDEX idx_coupon_usage_buyer_id ON coupon_usage(buyer_id);
CREATE INDEX idx_promotion_analytics_date ON promotion_analytics(date);

-- Disable RLS
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_analytics DISABLE ROW LEVEL SECURITY;
