-- Rider payout requests and payout history
-- Optional migration: enables rider wallet payout tracking.

CREATE TABLE IF NOT EXISTS logistics_rider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES logistics_riders(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | rejected
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_rider_payouts_rider_id ON logistics_rider_payouts(rider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_rider_payouts_status ON logistics_rider_payouts(status);
