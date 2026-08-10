-- Core notifications table (in-app)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'system', 'alert', 'report')),
  event_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_event_key_unique ON user_notifications(event_key) WHERE event_key IS NOT NULL;

-- Generic anti-spam / dedupe event log
CREATE TABLE IF NOT EXISTS automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  user_id TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_events_event_type ON automation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_events_user_id ON automation_events(user_id);

-- Order automation state (for reminder intelligence)
CREATE TABLE IF NOT EXISTS order_automation_state (
  order_id TEXT PRIMARY KEY,
  merchant_id TEXT,
  buyer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  buyer_notified_at TIMESTAMPTZ,
  merchant_notified_at TIMESTAMPTZ,
  payment_notified_at TIMESTAMPTZ,
  logistics_registered_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_automation_reminder ON order_automation_state(reminder_sent_at, created_at);

-- Weekly report guard (once per merchant per week)
CREATE TABLE IF NOT EXISTS weekly_business_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  totals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, week_start)
);

-- Cart session tracker (for abandoned-cart recovery)
CREATE TABLE IF NOT EXISTS cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  cart_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_abandoned ON cart_sessions(last_active_at, checked_out_at, reminder_sent_at);
