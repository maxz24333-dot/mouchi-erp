'use client'
import { useState, useEffect } from 'react'

interface Settings {
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

const DEFAULT: Settings = {
  thailand_shipping_per_kg: 160,
  haido_shipping_per_kg: 280,
  mdm_shipping_per_kg: 280,
  sd_shipping_per_kg: 280,
  other_shipping_per_kg: 280,
  korea_shipping_per_kg: 165,
  default_service_fee_pct: 0.03,
  default_packaging_fee: 10,
  handling_fee_pct: 0.05,
  target_margin_pct: 0.4,
  exchange_rate_buffer: 1.15,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rates, setRates] = useState<{ THB: number; JPY: number; fetched_at: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { if (d) setSettings(d) })
    fetch('/api/exchange-rate').then(r => r.json()).then(d => setRates(d))
  }, [])

  function update(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <h1 className="text-base font-bold text-gray-800">系統設定</h1>
        <p className="text-xs text-gray-400">調整後記得儲存</p>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* 匯率資訊 */}
        <Section title="今日匯率（台銀現金賣出）">
          {rates ? (
            <div className="space-y-2">
              <InfoRow label="日幣 JPY" value={`1 JPY = NT$${rates.JPY}`} sub={`×${settings.exchange_rate_buffer} = NT$${(rates.JPY * settings.exchange_rate_buffer).toFixed(4)}`} />
              <InfoRow label="泰銖 THB" value={`1 THB = NT$${rates.THB}`} sub={`×${settings.exchange_rate_buffer} = NT$${(rates.THB * settings.exchange_rate_buffer).toFixed(4)}`} />
              <InfoRow label="韓元 KRW" value="固定 1 TWD = 40 KRW" sub="不串 API" />
              <p className="text-xs text-gray-400 mt-1">更新時間：{new Date(rates.fetched_at).toLocaleString('zh-TW')}</p>
            </div>
          ) : (
            <div className="skeleton h-16" />
          )}
        </Section>

        {/* 匯率緩衝 */}
        <Section title="匯率保守係數">
          <p className="text-xs text-gray-400 mb-2">實際使用匯率 = 台銀匯率 × 此係數，預設 1.15（+15%）</p>
          <NumberInput
            label="係數"
            value={settings.exchange_rate_buffer}
            onChange={v => update('exchange_rate_buffer', v)}
            step="0.01"
            unit="倍"
          />
        </Section>

        {/* 運費設定 */}
        <Section title="空運費率（NT$ / 公斤）">
          <div className="space-y-3">
            <NumberInput label="🇹🇭 泰國" value={settings.thailand_shipping_per_kg} onChange={v => update('thailand_shipping_per_kg', v)} unit="元/kg" />
            <NumberInput label="🇯🇵 日本（海度）" value={settings.haido_shipping_per_kg} onChange={v => update('haido_shipping_per_kg', v)} unit="元/kg" />
            <NumberInput label="🇯🇵 日本（MDM）" value={settings.mdm_shipping_per_kg} onChange={v => update('mdm_shipping_per_kg', v)} unit="元/kg" />
            <NumberInput label="🇯🇵 日本（SD）" value={settings.sd_shipping_per_kg} onChange={v => update('sd_shipping_per_kg', v)} unit="元/kg" />
            <NumberInput label="🇰🇷 韓國" value={settings.korea_shipping_per_kg} onChange={v => update('korea_shipping_per_kg', v)} unit="元/kg" />
            <NumberInput label="📦 其他" value={settings.other_shipping_per_kg} onChange={v => update('other_shipping_per_kg', v)} unit="元/kg" />
          </div>
        </Section>

        {/* 成本預設 */}
        <Section title="成本預設值">
          <div className="space-y-3">
            <NumberInput label="預設服務費率" value={settings.default_service_fee_pct * 100} onChange={v => update('default_service_fee_pct', String(parseFloat(v) / 100))} unit="%" />
            <NumberInput label="預設包裝費" value={settings.default_packaging_fee} onChange={v => update('default_packaging_fee', v)} unit="元" />
            <NumberInput label="手續費（人工成本）" value={settings.handling_fee_pct * 100} onChange={v => update('handling_fee_pct', String(parseFloat(v) / 100))} unit="%" />
          </div>
        </Section>

        {/* 策略判斷 */}
        <Section title="商品戰略判斷">
          <p className="text-xs text-gray-400 mb-2">毛利率低於此值 × 0.7 → 引流品；高於此值 × 1.2 → 利潤品</p>
          <NumberInput label="目標毛利率" value={settings.target_margin_pct * 100} onChange={v => update('target_margin_pct', String(parseFloat(v) / 100))} unit="%" />
        </Section>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all
            ${saved ? 'bg-green-500' : 'bg-pink-500 active:bg-pink-600 shadow-lg shadow-pink-200'}`}
        >
          {saved ? '✓ 已儲存' : saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function NumberInput({ label, value, onChange, unit, step = '1' }: {
  label: string; value: number; onChange: (v: string) => void; unit: string; step?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-600 flex-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          step={step}
          className="w-24 text-right text-sm font-semibold border-b border-gray-200 focus:border-pink-400 outline-none pb-0.5 bg-transparent"
        />
        <span className="text-xs text-gray-400 w-8">{unit}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-800">{value}</p>
        <p className="text-xs text-pink-500">{sub}</p>
      </div>
    </div>
  )
}
