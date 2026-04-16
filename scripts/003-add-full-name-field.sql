-- Add full_name column to auth_users table
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS full_name TEXT;
