-- Run this script in your Supabase SQL Editor to create the necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- OPTION 1: Simple JSON State Sync (Recommended for this POS architecture)
-- ==========================================
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- OPTION 2: Full Relational Schema (For future advanced use cases)
-- ==========================================
-- 1. Store Profiles
CREATE TABLE IF NOT EXISTS store_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT,
  pincode TEXT,
  gst TEXT,
  phone TEXT,
  timings TEXT,
  online_orders_enabled BOOLEAN DEFAULT false,
  delivery_enabled BOOLEAN DEFAULT false
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  gst_rate NUMERIC DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 0
);

-- 3. Batches
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  purchase_rate NUMERIC NOT NULL,
  mrp NUMERIC NOT NULL,
  stock INTEGER NOT NULL,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_enabled BOOLEAN DEFAULT false,
  online_stock INTEGER,
  online_status TEXT DEFAULT 'OFFLINE',
  booked_stock INTEGER DEFAULT 0
);

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  balance NUMERIC DEFAULT 0
);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL,
  tax NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  mrp NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  gst_rate NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  final_price NUMERIC NOT NULL
);

-- 7. Ledger Entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  source TEXT NOT NULL
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

-- 9. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  details TEXT,
  contact TEXT
);

-- 10. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  supplier_details TEXT,
  vendor_details TEXT
);

-- 11. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  expected_rate NUMERIC
);

-- 12. Stock Ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT
);

-- 13. Daily Ledgers
CREATE TABLE IF NOT EXISTS daily_ledgers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  opening_balance NUMERIC NOT NULL,
  gross_sales NUMERIC NOT NULL,
  online_sales NUMERIC NOT NULL,
  credit_sales NUMERIC NOT NULL,
  expenses NUMERIC NOT NULL,
  actual_cash NUMERIC NOT NULL,
  bank_deposit NUMERIC NOT NULL,
  expected_cash NUMERIC NOT NULL,
  difference NUMERIC NOT NULL,
  closing_balance NUMERIC NOT NULL
);

-- Disable Row Level Security (RLS) for all tables to allow public access for this simple POS app
-- (In a production app with auth, you would enable RLS and write policies)
ALTER TABLE store_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ledgers DISABLE ROW LEVEL SECURITY;
