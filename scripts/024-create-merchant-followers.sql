-- Buyers can follow merchants and receive update notifications.
CREATE TABLE IF NOT EXISTS merchant_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_followers_merchant_id ON merchant_followers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_followers_buyer_id ON merchant_followers(buyer_id);

-- Keep consistent with current project posture.
ALTER TABLE merchant_followers DISABLE ROW LEVEL SECURITY;
