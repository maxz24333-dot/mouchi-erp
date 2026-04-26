export type Source = 'thailand' | 'haido' | 'mdm' | 'sd' | 'other' | 'korea'
export type JapanSupplier = 'haido' | 'mdm' | 'sd' | 'other'

export interface SourceConfig {
  label: string
  currency: 'THB' | 'JPY' | 'KRW' | 'TWD'
  taxRate: number       // e.g. 1.1 for Japan 10% consumption tax
  shippingPerGram: number
  serviceFeePct: number // default 0.03
  exchangeRate?: number // null = fetch from API, number = fixed
}

export interface ProductEntry {
  id?: string
  created_at?: string
  image_url: string
  source: Source
  original_cost: number        // 原始幣別金額
  weight_g: number
  packaging_fee: number        // 包裝費用
  service_fee_pct: number      // 服務費率
  include_tax: boolean         // 是否含稅（韓國可切換）
  include_handling: boolean    // 是否加計手續費(×1.05)
  exchange_rate: number        // 當下使用的匯率
  twd_cost: number             // 台幣成本
  shipping_fee: number         // 運費
  total_cost: number           // 成本總計（不含手續費）
  total_cost_with_handling: number // 成本總計（含手續費）
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

export interface Settings {
  thailand_shipping_per_kg: number
  haido_shipping_per_kg: number
  mdm_shipping_per_kg: number
  sd_shipping_per_kg: number
  other_shipping_per_kg: number
  korea_shipping_per_kg: number
  default_service_fee_pct: number
  default_packaging_fee: number
  handling_fee_pct: number
  target_margin_pct: number
  exchange_rate_buffer: number
}

export interface ExchangeRates {
  THB: number
  JPY: number
  fetched_at: string
}
