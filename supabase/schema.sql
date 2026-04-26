-- ============================================================
-- MOUCHI ERP - Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop existing views/tables for clean re-run
DROP VIEW IF EXISTS products_with_stock;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS exchange_rate_cache;

-- Settings table (single row)
CREATE TABLE settings (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thailand_shipping_per_kg    numeric NOT NULL DEFAULT 160,
  haido_shipping_per_kg       numeric NOT NULL DEFAULT 280,
  mdm_shipping_per_kg         numeric NOT NULL DEFAULT 280,
  sd_shipping_per_kg          numeric NOT NULL DEFAULT 280,
  other_shipping_per_kg       numeric NOT NULL DEFAULT 280,
  korea_shipping_per_kg       numeric NOT NULL DEFAULT 165,
  default_service_fee_pct     numeric NOT NULL DEFAULT 0.03,
  default_packaging_fee       numeric NOT NULL DEFAULT 10,
  handling_fee_pct            numeric NOT NULL DEFAULT 0.05,
  target_margin_pct           numeric NOT NULL DEFAULT 0.4,
  exchange_rate_buffer        numeric NOT NULL DEFAULT 1.15,
  updated_at                  timestamptz DEFAULT now()
);

INSERT INTO settings DEFAULT VALUES;

-- Products table
CREATE TABLE products (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz DEFAULT now(),
  image_url                   text,
  source                      text NOT NULL CHECK (source IN ('thailand','haido','mdm','sd','other','korea')),
  product_code                text NOT NULL DEFAULT '',
  product_name                text NOT NULL DEFAULT '',
  original_cost               numeric NOT NULL,
  weight_g                    numeric NOT NULL DEFAULT 0,
  packaging_fee               numeric NOT NULL DEFAULT 10,
  service_fee_pct             numeric NOT NULL DEFAULT 0.03,
  include_tax                 boolean NOT NULL DEFAULT true,
  include_handling            boolean NOT NULL DEFAULT true,
  exchange_rate               numeric NOT NULL,
  twd_cost                    numeric NOT NULL,
  shipping_fee                numeric NOT NULL,
  total_cost                  numeric NOT NULL,
  total_cost_with_handling    numeric NOT NULL,
  ai_suggested_name           text,
  supplier_suggested_price    numeric,
  market_price_low            numeric,
  market_price_high           numeric,
  market_price_avg            numeric,
  my_selling_price            numeric,
  profit_margin               numeric,
  strategy_tag                text CHECK (strategy_tag IN ('lead','profit','skip')),
  stock_quantity              integer NOT NULL DEFAULT 0,
  sold_quantity               integer NOT NULL DEFAULT 0,
  notes                       text NOT NULL DEFAULT '',
  supplier_copy               text NOT NULL DEFAULT '',
  ad_copy                     text NOT NULL DEFAULT ''
);

-- Computed view: remaining stock + status
CREATE VIEW products_with_stock AS
SELECT *,
  (stock_quantity - sold_quantity) AS remaining_stock,
  CASE
    WHEN (stock_quantity - sold_quantity) = 0 AND stock_quantity > 0 THEN 'sold_out'
    WHEN (stock_quantity - sold_quantity) > 0 AND (stock_quantity - sold_quantity) < 3 THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM products;

-- Exchange rate cache
CREATE TABLE exchange_rate_cache (
  id         serial PRIMARY KEY,
  thb        numeric NOT NULL,
  jpy        numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: open for now
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rates" ON exchange_rate_cache FOR ALL USING (true) WITH CHECK (true);
