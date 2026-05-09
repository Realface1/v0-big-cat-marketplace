-- Fix onboarding escrow and agent wallet tables to match existing onboarding request IDs
-- Run this in Supabase SQL Editor if scripts/027-agent-wallet-onboarding-fee.sql was already applied

ALTER TABLE onboarding_escrow
  ALTER COLUMN onboarding_request_id TYPE VARCHAR(100)
  USING onboarding_request_id::text;

ALTER TABLE agent_transactions
  ALTER COLUMN onboarding_request_id TYPE VARCHAR(100)
  USING onboarding_request_id::text;
