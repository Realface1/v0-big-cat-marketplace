-- Add merchant city/state fields used during signup
ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS state TEXT;

-- Backfill the location field from city/state where possible
UPDATE public.auth_users
SET location = TRIM(
  CONCAT(
    COALESCE(NULLIF(city, ''), ''),
    CASE
      WHEN COALESCE(NULLIF(city, ''), '') <> '' AND COALESCE(NULLIF(state, ''), '') <> '' THEN ', '
      ELSE ''
    END,
    COALESCE(NULLIF(state, ''), '')
  )
)
WHERE role = 'merchant'
  AND (location IS NULL OR location = '');
