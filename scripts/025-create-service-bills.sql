-- Service Bills: merchant creates a bill, sends to buyer, buyer pays through platform
CREATE TABLE IF NOT EXISTS service_bills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id text NOT NULL,
  buyer_id text NOT NULL,
  service_listing_id uuid,
  scope_summary text,
  timeline text,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'draft', -- draft | sent | paid | cancelled
  booking_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_bills_merchant_id ON service_bills(merchant_id);
CREATE INDEX IF NOT EXISTS idx_service_bills_buyer_id ON service_bills(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_bills_status ON service_bills(status);

ALTER TABLE service_bills DISABLE ROW LEVEL SECURITY;
