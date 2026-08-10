-- Extend promotions table with template v2 rule support
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'standard' CHECK (rule_type IN ('standard', 'spend_x_save_y', 'buy_x_get_y', 'nth_item_discount'));
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS spend_threshold DECIMAL(10, 2);
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS buy_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS get_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS nth_item INTEGER;

-- Create banner A/B testing table
CREATE TABLE IF NOT EXISTS banner_ab_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banner_ab_events_merchant_variant ON banner_ab_events(merchant_id, variant);
CREATE INDEX IF NOT EXISTS idx_banner_ab_events_created_at ON banner_ab_events(created_at);

ALTER TABLE banner_ab_events DISABLE ROW LEVEL SECURITY;
