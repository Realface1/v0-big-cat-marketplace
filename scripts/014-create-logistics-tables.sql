-- Standalone logistics module tables
-- Run this migration in Supabase SQL editor before using /logistics portal in production.

CREATE TABLE IF NOT EXISTS logistics_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  rider_id UUID REFERENCES logistics_riders(id),
  logistics_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_order_id ON logistics_order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_rider_id ON logistics_order_assignments(rider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_status ON logistics_order_assignments(logistics_status);
CREATE INDEX IF NOT EXISTS idx_logistics_riders_active ON logistics_riders(is_active);
