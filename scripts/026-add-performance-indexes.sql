-- Performance indexes missing from earlier migrations
-- Run this in Supabase SQL Editor

-- orders(merchant_id) — used in getMerchantOrders, bulk revenue aggregation in cron jobs
-- Earlier scripts only indexed order_items(merchant_id), not orders(merchant_id)
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);

-- Faster order listings for buyer and merchant dashboards
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created_at
  ON orders(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_created_at
  ON orders(merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON orders(status, created_at DESC);

-- Composite index for cron bulk revenue query:
-- .in("merchant_id", ids).in("status", settled).gte("created_at", from).lt("created_at", to)
CREATE INDEX IF NOT EXISTS idx_orders_merchant_status_created
  ON orders(merchant_id, status, created_at DESC);

-- products(is_active) — primary filter on every marketplace load
-- Earlier scripts have products(category) and products(status) but not is_active
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Composite for filtered marketplace queries:
-- .eq('is_active', true).eq('category', ...).order('created_at')
CREATE INDEX IF NOT EXISTS idx_products_active_category_created
  ON products(is_active, category, created_at DESC);

-- weekly_business_report_logs — used in deduplication check per cron run
CREATE INDEX IF NOT EXISTS idx_weekly_report_logs_merchant_week
  ON weekly_business_report_logs(merchant_id, week_start);

-- Order item and review lookups for product detail pages and post-purchase flows
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_merchant ON order_items(order_id, merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created_at ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_user ON reviews(product_id, user_id);

-- Support issue and escrow lookups used by admin, logistics, and wallet flows
CREATE INDEX IF NOT EXISTS idx_support_issues_order_status_created_at
  ON support_issues(order_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_issues_buyer_status_created_at
  ON support_issues(buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_order_status ON escrow(order_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_recipient_status_created_at
  ON escrow(recipient_id, status, created_at DESC);

-- Conversations and messages need fast inbox/message history reads at scale
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_last_message_at
  ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_merchant_last_message_at
  ON conversations(merchant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at ASC);

-- auth_users(role) already exists in create-auth-schema.sql — no duplicate needed
-- orders(buyer_id), orders(status) already exist in 001/005 — no duplicate needed
-- products(category), products(merchant_id) already exist in 004 — no duplicate needed
