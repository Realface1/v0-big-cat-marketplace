-- Agent wallet system + onboarding fee escrow
-- Run this in Supabase SQL Editor

-- 1. Track onboarding fee on each request
ALTER TABLE merchant_onboarding_requests
  ADD COLUMN IF NOT EXISTS onboarding_fee_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_fee_reference VARCHAR(200),
  ADD COLUMN IF NOT EXISTS onboarding_fee_escrowed_at TIMESTAMPTZ;

-- 2. Onboarding escrow table (holds ₦2,000 per merchant until agent completes)
CREATE TABLE IF NOT EXISTS onboarding_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_request_id VARCHAR(100) NOT NULL,
  agent_id VARCHAR(100),
  amount INTEGER NOT NULL DEFAULT 2000,
  status VARCHAR(50) NOT NULL DEFAULT 'held',  -- held | released | refunded
  payment_reference VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onboarding_escrow_request_id
  ON onboarding_escrow(onboarding_request_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_escrow_agent_status
  ON onboarding_escrow(agent_id, status);

-- 3. Agent wallet transactions (earnings from completed onboardings)
CREATE TABLE IF NOT EXISTS agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(100) NOT NULL,
  onboarding_request_id VARCHAR(100),
  type VARCHAR(50) NOT NULL DEFAULT 'onboarding_fee',  -- onboarding_fee | withdrawal
  amount INTEGER NOT NULL DEFAULT 0,                   -- in Naira
  status VARCHAR(50) NOT NULL DEFAULT 'completed',     -- completed | pending | failed
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_transactions_agent_created
  ON agent_transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_request_id
  ON agent_transactions(onboarding_request_id);
