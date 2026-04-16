-- 1. AUTH USERS TABLE
CREATE TABLE IF NOT EXISTS auth_users (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'buyer',
  full_name VARCHAR(255),
  address TEXT,
  avatar_url TEXT,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  business_name VARCHAR(255),
  business_description TEXT,
  business_category VARCHAR(100),
  smedan_id VARCHAR(100),
  cac_id VARCHAR(100),
  google_id VARCHAR(255),
  setup_completed BOOLEAN DEFAULT false,
  city VARCHAR(100),
  state VARCHAR(100),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY,
  merchant_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category VARCHAR(100),
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  buyer_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  status VARCHAR(50) DEFAULT 'pending',
  grand_total NUMERIC(10,2),
  product_total NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  delivery_type VARCHAR(50) DEFAULT 'normal',
  delivery_address TEXT,
  payment_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(100) PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL REFERENCES orders(id),
  product_id VARCHAR(100) NOT NULL,
  merchant_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  weight NUMERIC(10,2) DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 5. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(100) PRIMARY KEY,
  buyer_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  merchant_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  last_message_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(buyer_id, merchant_id)
);
COMMIT;

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(100) PRIMARY KEY,
  conversation_id VARCHAR(100) NOT NULL REFERENCES conversations(id),
  sender_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 7. PAYMENT METHODS TABLE
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES auth_users(id),
  card_type VARCHAR(50) NOT NULL,
  card_last_four VARCHAR(4) NOT NULL,
  card_holder_name VARCHAR(255) NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

-- 8. CREATE INDEXES (ASYNC required for Aurora DSQL)
CREATE INDEX ASYNC IF NOT EXISTS idx_products_merchant ON products(merchant_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_products_category ON products(category);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_order_items_order ON order_items(order_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_order_items_merchant ON order_items(merchant_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_conversations_merchant ON conversations(merchant_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_messages_sender ON messages(sender_id);
COMMIT;
CREATE INDEX ASYNC IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
COMMIT;
