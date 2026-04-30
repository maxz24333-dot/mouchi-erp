'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { SourceRow, Settings } from '@/types'
import { calcCost, suggestStrategy } from '@/lib/cost'
import ImageUploader from '@/components/ImageUploader'
import SourceSelector from '@/components/SourceSelector'
import CostResultCard from '@/components/CostResultCard'
import QuantityPicker from '@/components/QuantityPicker'

const DEFAULT_SETTINGS: Settings = {
  default_service_fee_pct: 0.03,
  default_packaging_fee: 10,
  handling_fee_pct: 0.05,
  target_margin_pct: 0.4,
  exchange_rate_buffer: 1.05,
}

export default function EntryPage() {
  // --- image ---
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // --- source ---
  const [sources, setSources]           = useState<SourceRow[]>([])
  const [selectedSource, setSelectedSource] = useState<SourceRow | null>(null)

  // --- product info ---
  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [sellingName, setSellingName] = useState('')

  // --- cost inputs ---
  const [originalCost, setOriginalCost]         = useState('')
  const [weightG, setWeightG]                   = useState('')
  const [shippingRateInput, setShippingRateInput] = useState('')
  const [packagingFee, setPackagingFee]          = useState('10')
  const [serviceFeePct, setServiceFeePct]        = useState('')
  const [includeServiceFee, setIncludeServiceFee] = useState(false)

  // --- pricing ---
  const [supplierPriceLocal, setSupplierPriceLocal] = useState('')
  const [mySellingPrice, setMySellingPrice]          = useState('')

  // --- misc ---
  const [quantity, setQuantity] = useState(0)
  const [notes, setNotes]       = useState('')

  // --- AI results ---
  const [aiLoading, setAiLoading] = useState(false)
  const [aiName, setAiName]       = useState<string | null>(null)
  const [marketLow, setMarketLow]     = useState<number | null>(null)
  const [marketHigh, setMarketHigh]   = useState<number | null>(null)
  const [marketAvg, setMarketAvg]     = useState<number | null>(null)
  const [marketStage, setMarketStage]           = useState<string | null>(null)
  const [marketStageAdvice, setMarketStageAdvice] = useState<string | null>(null)
  const [marketMultiplier, setMarketMultiplier]   = useState<number>(1.0)
  const [ecommerceCount, setEcommerceCount]       = useState<number>(0)
  const [socialLow, setSocialLow]     = useState<number | null>(null)
  const [socialHigh, setSocialHigh]   = useState<number | null>(null)
  const [socialAvg, setSocialAvg]     = useState<number | null>(null)
  const [socialCount, setSocialCount] = useState<number>(0)
  const [isBranded, setIsBranded]     = useState(false)

  // --- remote data ---
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [dashboard, setDashboard] = useState<{
    month_revenue: number; month_profit: number
    total_stock: number; low_stock_count: number
  } | null>(null)

  // --- copy ---
  const [copyOpen, setCopyOpen]         = useState(false)
  const [supplierCopy, setSupplierCopy] = useState('')
  const [adCopy, setAdCopy]             = useState('')
  const [copyLoading, setCopyLoading]   = useState(false)

  // --- submit ---
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)

  useEffect(() => {
    fetch('/api/sources').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) {
        setSources(d)
        setSelectedSource(d[0])
      }
    }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d) setSettings(prev => ({ ...prev, ...d }))
    }).catch(() => {})
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      if (!d.error) setDashboard(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (aiName && !sellingName) setSellingName(aiName)
  }, [aiName])

  const autoFilledPrice = useRef(false)

  // --- derived ---
  const rawRate      = selectedSource?.exchange_rate ?? 0
  const exchangeRate = rawRate * settings.exchange_rate_buffer
  const shippingPerKg = parseFloat(shippingRateInput) || selectedSource?.shipping_per_kg || 280
  const weightNum    = parseFloat(weightG) || 0
  const calcShipping = (weightNum / 1000) * shippingPerKg

  const cost = (originalCost && exchangeRate && selectedSource) ? calcCost(
    {
      originalCost:  parseFloat(originalCost),
      weightG:       weightNum,
      packagingFee:  parseFloat(packagingFee) || 10,
      serviceFeePct: includeServiceFee
        ? (serviceFeePct !== '' ? parseFloat(serviceFeePct) / 100 : settings.default_service_fee_pct)
        : 0,
      taxPct:         selectedSource.tax_pct,
      exchangeRate,
      handlingFeePct: settings.handling_fee_pct,
    },
    shippingPerKg
  ) : null

  const supplierPriceTWD = (parseFloat(supplierPriceLocal) || 0) * exchangeRate
  const sellingPriceNum  = parseFloat(mySellingPrice) || 0
  const strategyTag      = cost && sellingPriceNum > 0
    ? suggestStrategy(cost.totalCostWithHandling, sellingPriceNum, marketAvg, settings.target_margin_pct)
    : null
  const currLabel = selectedSource?.currency ?? '—'

  useEffect(() => {
    if (autoFilledPrice.current) return
    if (!marketAvg || !cost || mySellingPrice) return
    const marginBased = cost.totalCostWithHandling / (1 - settings.target_margin_pct)
    const marketBased = marketAvg * marketMultiplier
    const suggested = Math.ceil(Math.max(marketBased, marginBased) / 50) * 50
    if (suggested > 0) { setMySellingPrice(String(suggested)); autoFilledPrice.current = true }
  }, [marketAvg, cost, marketMultiplier])

  const runAI = useCallback(async (file: File) => {
    if (!selectedSource) return
    setAiLoading(true)
    setAiName(null); setSellingName(''); autoFilledPrice.current = false
    setMarketLow(null); setMarketHigh(null); setMarketAvg(null)
    setMarketStage(null); setMarketStageAdvice(null); setMarketMultiplier(1.0)
    setEcommerceCount(0)
    setSocialLow(null); setSocialHigh(null); setSocialAvg(null); setSocialCount(0)
    setIsBranded(false)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const priceForm = new FormData()
      priceForm.append('image', file)
      priceForm.append('source', selectedSource.id)
      priceForm.append('search_country', selectedSource.search_country)
      const [nameRes, priceRes] = await Promise.allSettled([
        fetch('/api/ai-name', { method: 'POST', body: formData }),
        fetch('/api/market-price', { method: 'POST', body: priceForm }),
      ])
      if (nameRes.status === 'fulfilled' && nameRes.value.ok) {
        const d = await nameRes.value.json(); setAiName(d.name)
      }
      if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
        const d = await priceRes.value.json()
        setMarketLow(d.low); setMarketHigh(d.high); setMarketAvg(d.avg)
        setMarketStage(d.stage ?? null); setMarketStageAdvice(d.stageAdvice ?? null)
        setMarketMultiplier(d.suggestedMultiplier ?? 1.0)
        setEcommerceCount(d.ecommerceCount ?? 0)
        setSocialLow(d.socialLow ?? null); setSocialHigh(d.socialHigh ?? null)
        setSocialAvg(d.socialAvg ?? null); setSocialCount(d.socialCount ?? 0)
        setIsBranded(d.isBranded ?? false)
      }
    } finally { setAiLoading(false) }
  }, [selectedSource])

  function handleImage(file: File, url: string) { setImageFile(file); setPreviewUrl(url); runAI(file) }

  async function generateCopy() {
    setCopyLoading(true)
    try {
      const body: Record<string, unknown> = {
        productName: sellingName || aiName || productName,
        source: selectedSource?.id,
        supplierCopy,
      }
      if (imageFile) { body.image = await toBase64(imageFile); body.imageMimeType = imageFile.type }
      const res = await fetch('/api/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { const d = await res.json(); setAdCopy(d.copy) }
    } finally { setCopyLoading(false) }
  }

  async function handleSubmit() {
    if (!cost || !selectedSource) return
    setSubmitting(true)
    try {
      const body = {
        image:           imageFile ? await toBase64(imageFile) : null,
        image_mime_type: imageFile?.type || 'image/jpeg',
        source:          selectedSource.id,
        product_code:    productCode,
        product_name:    productName,
        original_cost:   parseFloat(originalCost),
        weight_g:        weightNum,
        packaging_fee:   parseFloat(packagingFee) || 10,
        service_fee_pct: serviceFeePct !== '' ? parseFloat(serviceFeePct) / 100 : settings.default_service_fee_pct,
        include_tax:     selectedSource.tax_pct > 0,
        include_handling: true,
        exchange_rate:   exchangeRate,
        twd_cost:        cost.twdCost,
        shipping_fee:    cost.shippingFee,
        total_cost:      cost.totalCost,
        total_cost_with_handling: cost.totalCostWithHandling,
        ai_suggested_name:        sellingName || aiName,
        supplier_suggested_price: supplierPriceTWD || null,
        market_price_low:  marketLow,
        market_price_high: marketHigh,
        market_price_avg:  marketAvg,
        my_selling_price:  sellingPriceNum || null,
        profit_margin:     sellingPriceNum > 0 ? cost.profitMargin(sellingPriceNum) : null,
        strategy_tag:      strategyTag,
        stock_quantity:    quantity,
        notes,
        supplier_copy: supplierCopy,
        ad_copy:       adCopy,
      }
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setSubmitDone(true); setTimeout(() => { setSubmitDone(false); resetForm() }, 1500) }
    } finally { setSubmitting(false) }
  }

  function resetForm() {
    setImageFile(null); setPreviewUrl(null)
    setProductCode(''); setProductName(''); setSellingName('')
    setOriginalCost(''); setWeightG(''); setShippingRateInput('')
    setPackagingFee('10'); setServiceFeePct(''); setIncludeServiceFee(false)
    setSupplierPriceLocal(''); setMySellingPrice('')
    setQuantity(0); setNotes('')
    setAiName(null); setMarketLow(null); setMarketHigh(null); setMarketAvg(null)
    setMarketStage(null); setMarketStageAdvice(null); setMarketMultiplier(1.0)
    setEcommerceCount(0); setSocialLow(null); setSocialHigh(null); setSocialAvg(null); setSocialCount(0)
    setIsBranded(false); setSupplierCopy(''); setAdCopy(''); setCopyOpen(false)
    autoFilledPrice.current = false
  }

  // ── Shared blocks ──────────────────────────────────────────────────

  const rateInfo = selectedSource?.exchange_rate
    ? `1 ${selectedSource.currency} ≈ NT$${(selectedSource.exchange_rate * settings.exchange_rate_buffer).toFixed(4)}`
    : selectedSource ? `⚠️ ${selectedSource.currency} 匯率未設定，請至設定頁更新` : ''

  const sourceBlock = (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="text-xs text-gray-500 font-medium">來源</p>
      <SourceSelector sources={sources} selectedId={selectedSource?.id ?? ''} onSelect={s => { setSelectedSource(s); autoFilledPrice.current = false }} />
      {rateInfo && (
        <p className={`text-xs ${selectedSource?.exchange_rate ? 'text-gray-400' : 'text-amber-500'}`}>{rateInfo}</p>
      )}
    </div>
  )

  const productBlock = (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="text-xs text-gray-500 font-medium">商品資料</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="商品編號">
          <input type="text" value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="SD-12345" className={inputCls} />
        </Field>
        <Field label="品名（原文）">
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="原廠品名" className={inputCls} />
        </Field>
      </div>
      <Field label={<span>販售名{aiLoading && <span className="text-pink-400 ml-1.5">AI 生成中…</span>}{aiName && !aiLoading && <span className="text-green-500 ml-1.5">✓</span>}</span>}>
        <input type="text" value={sellingName} onChange={e => setSellingName(e.target.value)}
          placeholder={aiLoading ? 'AI 辨識中…' : '上傳圖片後 AI 自動生成，可修改'} className={inputCls} />
      </Field>
    </div>
  )

  const costBlock = (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <p className="text-xs text-gray-500 font-medium">成本計算</p>
      <Field label={`當地成本（${currLabel}）`}>
        <input type="number" inputMode="numeric" value={originalCost} onChange={e => setOriginalCost(e.target.value)} placeholder="0"
          className="w-full text-2xl font-bold text-gray-800 border-b-2 border-pink-200 focus:border-pink-400 outline-none pb-1 bg-transparent" />
        {cost && <p className="text-xs text-gray-400 mt-1">≈ NT${cost.twdCost.toFixed(0)}</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="重量 (g)">
          <input type="number" inputMode="numeric" value={weightG} onChange={e => setWeightG(e.target.value)} placeholder="0" className={inputLgCls} />
        </Field>
        <div>
          <Field label="空運費率 (NT$/kg)">
            <input type="number" inputMode="numeric" value={shippingRateInput} onChange={e => setShippingRateInput(e.target.value)}
              placeholder={String(selectedSource?.shipping_per_kg ?? 280)} className={inputLgCls} />
          </Field>
          {weightNum > 0 && <p className="text-xs text-gray-400 mt-1">= NT${calcShipping.toFixed(0)}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="包裝費 (NT$)">
          <input type="number" inputMode="numeric" value={packagingFee} onChange={e => setPackagingFee(e.target.value)} placeholder="10" className={inputLgCls} />
        </Field>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">服務費率 (%)</span>
            <button type="button" onClick={() => setIncludeServiceFee(v => !v)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${includeServiceFee ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
              {includeServiceFee ? '✓ 計入' : '不計入'}
            </button>
          </div>
          <input type="number" inputMode="decimal" value={serviceFeePct} onChange={e => setServiceFeePct(e.target.value)}
            placeholder={`空白=${(settings.default_service_fee_pct * 100).toFixed(0)}%`} disabled={!includeServiceFee}
            className={`w-full text-lg font-semibold border-b outline-none pb-1 bg-transparent transition-all ${includeServiceFee ? 'border-gray-200 focus:border-pink-400 text-gray-800' : 'border-gray-100 text-gray-300'}`} />
        </div>
      </div>
      {selectedSource && selectedSource.tax_pct > 0 && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
          稅率 {(selectedSource.tax_pct * 100).toFixed(0)}% 已自動套用（來源設定）
        </p>
      )}
    </div>
  )

  const pricingBlock = (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <p className="text-xs text-gray-500 font-medium">定價</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field label={`廠商建議售價（${currLabel}）`}>
            <input type="number" inputMode="numeric" value={supplierPriceLocal} onChange={e => setSupplierPriceLocal(e.target.value)} placeholder="選填" className={inputLgCls} />
          </Field>
          {supplierPriceTWD > 0 && <p className="text-xs text-gray-400 mt-1">≈ NT${supplierPriceTWD.toFixed(0)}</p>}
        </div>
        <Field label="我的賣價 (NT$)">
          <input type="number" inputMode="numeric" value={mySellingPrice} onChange={e => setMySellingPrice(e.target.value)} placeholder="0" className={inputLgCls} />
        </Field>
      </div>
    </div>
  )

  const aiBlock = (
    <CostResultCard cost={cost} sellingPrice={sellingPriceNum}
      marketLow={marketLow} marketHigh={marketHigh} marketAvg={marketAvg} ecommerceCount={ecommerceCount}
      socialLow={socialLow} socialHigh={socialHigh} socialAvg={socialAvg} socialCount={socialCount}
      isBranded={isBranded}
      marketStage={marketStage} marketStageAdvice={marketStageAdvice}
      aiName={sellingName || aiName} loading={aiLoading} />
  )

  const copyBlock = (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button type="button" onClick={() => setCopyOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        <span>✍️ 商品文案</span>
        <span className="text-gray-400 text-xs">{copyOpen ? '▲ 收起' : '▼ 展開'}</span>
      </button>
      {copyOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          <div className="pt-3">
            <label className="text-xs text-gray-400 block mb-1">廠商原文文案（選填）</label>
            <textarea value={supplierCopy} onChange={e => setSupplierCopy(e.target.value)}
              placeholder="可貼上任何語言原文…" rows={3}
              className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 outline-none resize-none" />
          </div>
          <button type="button" onClick={generateCopy} disabled={copyLoading || (!imageFile && !supplierCopy && !productName && !aiName)}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-40">
            {copyLoading ? '✨ AI 生成中…' : '✨ AI 生成文案'}
          </button>
          {adCopy && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">生成文案（可直接編輯）</label>
              <textarea value={adCopy} onChange={e => setAdCopy(e.target.value)} rows={12}
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 outline-none resize-none leading-relaxed" />
            </div>
          )}
        </div>
      )}
    </div>
  )

  const submitBtn = (
    <button type="button" onClick={handleSubmit} disabled={!cost || submitting || !selectedSource?.exchange_rate}
      className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all
        ${submitDone ? 'bg-green-500' : cost && selectedSource?.exchange_rate ? 'bg-pink-500 shadow-lg shadow-pink-200' : 'bg-gray-200 text-gray-400'}`}>
      {submitDone ? '✓ 入庫成功！' : submitting ? '寫入中…' : quantity > 0 ? `一鍵入庫 × ${quantity}` : '選品紀錄（庫存 0）'}
    </button>
  )

  // ── Desktop layout ─────────────────────────────────────────────────
  const desktopLayout = (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">新增選品</h1>
          {selectedSource?.exchange_rate && (
            <p className="text-sm text-gray-400 mt-0.5">
              1 {selectedSource.currency} ≈ NT${(selectedSource.exchange_rate * settings.exchange_rate_buffer).toFixed(4)}
              　×{settings.exchange_rate_buffer} 緩衝
            </p>
          )}
        </div>
        {dashboard && (
          <div className="flex gap-3">
            <MiniStat label="本月營收" value={`NT$${(dashboard.month_revenue/1000).toFixed(1)}k`} />
            <MiniStat label="本月獲利" value={`NT$${(dashboard.month_profit/1000).toFixed(1)}k`} pink />
            <MiniStat label="在庫" value={`${dashboard.total_stock} 件`} warn={dashboard.low_stock_count > 0} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-4">
          {sourceBlock}{productBlock}{costBlock}{pricingBlock}{copyBlock}
        </div>
        <div className="col-span-2 space-y-4">
          <ImageUploader onImage={handleImage} previewUrl={previewUrl} loading={aiLoading} />
          {aiBlock}
          <QuantityPicker value={quantity} onChange={setQuantity} />
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-xs text-gray-400 block mb-1">備註</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="尺碼、顏色、備注…" rows={2}
              className="w-full text-sm text-gray-700 outline-none resize-none bg-transparent" />
          </div>
          {submitBtn}
        </div>
      </div>
    </div>
  )

  // ── Mobile layout ──────────────────────────────────────────────────
  const mobileLayout = (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">MOUCHI</h1>
          <p className="text-xs text-gray-400">快速入庫</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedSource?.exchange_rate && (
            <div className="text-xs text-right text-gray-400">
              <div>1 {selectedSource.currency} ≈ NT${(selectedSource.exchange_rate * settings.exchange_rate_buffer).toFixed(4)}</div>
            </div>
          )}
          <Link href="/inventory" className="text-xs text-pink-500 font-medium">庫存 →</Link>
        </div>
      </header>
      <div className="px-4 py-4 space-y-3">
        {dashboard && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="本月營收" value={`NT$${(dashboard.month_revenue/1000).toFixed(1)}k`} />
            <StatCard label="本月獲利" value={`NT$${(dashboard.month_profit/1000).toFixed(1)}k`} accent />
            <StatCard label="在庫商品" value={`${dashboard.total_stock} 件`} warn={dashboard.low_stock_count > 0} />
          </div>
        )}
        {sourceBlock}
        <ImageUploader onImage={handleImage} previewUrl={previewUrl} loading={aiLoading} compact />
        {productBlock}{costBlock}{pricingBlock}{aiBlock}{copyBlock}
        <QuantityPicker value={quantity} onChange={setQuantity} />
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs text-gray-400 block mb-1">備註</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="尺碼、顏色、備注…" rows={2}
            className="w-full text-sm text-gray-700 outline-none resize-none bg-transparent" />
        </div>
      </div>
      <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto px-4 pb-3 pt-3 bg-gradient-to-t from-[#f5f0eb] to-transparent">
        {submitBtn}
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{desktopLayout}</div>
      <div className="lg:hidden">{mobileLayout}</div>
    </>
  )
}

// ── helpers ──
const inputCls   = 'w-full text-sm font-medium border-b border-gray-200 focus:border-pink-400 outline-none pb-1 bg-transparent'
const inputLgCls = 'w-full text-lg font-semibold border-b border-gray-200 focus:border-pink-400 outline-none pb-1 bg-transparent'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div><label className="text-xs text-gray-400 block mb-1">{label}</label>{children}</div>
}
function MiniStat({ label, value, pink, warn }: { label: string; value: string; pink?: boolean; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${pink ? 'text-pink-600' : warn ? 'text-amber-500' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
function StatCard({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 text-center">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${accent ? 'text-pink-600' : warn ? 'text-amber-500' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
