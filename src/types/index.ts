export interface SourceRow {
  id: string
  label: string
  currency: string
  tax_pct: number
  shipping_per_kg: number
  search_country: string
  exchange_rate: number | null
  exchange_rate_updated_at: string | null
  sort_order: number
  created_at?: string
}

export interface Settings {
  default_service_fee_pct: number
  default_packaging_fee: number
  handling_fee_pct: number
  target_margin_pct: number
  exchange_rate_buffer: number
}

export interface ProductEntry {
  id?: string
  created_at?: string
  image_url: string
  source: string
  original_cost: number
  weight_g: number
  packaging_fee: number
  service_fee_pct: number
  include_tax: boolean
  include_handling: boolean
  exchange_rate: number
  twd_cost: number
  shipping_fee: number
  total_cost: number
  total_cost_with_handling: number
  product_code: string
  product_name: string
  ai_suggested_name: string | null
  market_price_low: number | null
  market_price_high: number | null
  market_price_avg: number | null
  my_selling_price: number | null
  profit_margin: number | null
  strategy_tag: 'lead' | 'profit' | 'skip' | null
  stock_quantity: number
  sold_quantity: number
  notes: string
}

export interface ProductVariant {
  id: string
  product_id: string
  label: string
  stock_quantity: number
  sold_quantity: number
  sort_order: number
  created_at?: string
}

export interface ExchangeRates {
  THB: number
  JPY: number
  fetched_at: string
}
