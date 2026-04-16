-- Add merchant CAC ID and Google identity linkage to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS cac_id TEXT,
ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Helpful indexes for lookup and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_google_id
ON auth_users(google_id)
WHERE google_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_users_cac_id ON auth_users(cac_id);
