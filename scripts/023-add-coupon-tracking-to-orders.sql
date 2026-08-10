-- Add coupon tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS applied_coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_total DECIMAL(10, 2);

-- Create index for coupon tracking
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(applied_coupon_code);
