ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0;

UPDATE public.products
SET cost_price = COALESCE(cost_price, 0)
WHERE cost_price IS NULL;
