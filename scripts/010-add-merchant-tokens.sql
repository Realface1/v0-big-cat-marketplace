-- Add token balance to auth users and seed merchants with starter tokens
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS token_balance INTEGER NOT NULL DEFAULT 0;

-- Enforce non-negative balances
ALTER TABLE auth_users
DROP CONSTRAINT IF EXISTS auth_users_token_balance_non_negative;

ALTER TABLE auth_users
ADD CONSTRAINT auth_users_token_balance_non_negative CHECK (token_balance >= 0);

-- Seed existing merchants that have no token history
UPDATE auth_users
SET token_balance = 100
WHERE role = 'merchant'
  AND COALESCE(token_balance, 0) = 0;
