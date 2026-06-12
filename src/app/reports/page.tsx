'use client'
import { useState, useEffect, useCallback } from 'react'

type Period = 'this_month' | 'last_month' | 'last_3m' | 'this_year' | 'all' | 'custom'
type BrandFilter = 'all' | 'mouchi' | 'wholesale'

const PERIODS: { v: Period; l: string }[] = [
  { v: 'this_month', l: '本月' },
  { v: 'last_month', l: '上月' },
  { v: 'last_3m',    l: '近3個月' },
  { v: 'this_year',  l: '今年' },
  { v: 'all',        l: '全部' },
  { v: 'custom',     l: '自訂' },
]

const EXPENSE_CATS = ['廣告/宣傳', '運費', '包材', '平台費', '其他']

function periodDates(p: Period, cf: string, ct: string): { from?: string; to?: string } {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  if (p === 'this_month') return { from: `${y}-${pad(m+1)}-01`, to: ymd(now) }
  if (p === 'last_month') { const f=new Date(y,m-1,1),l=new Date(y,m,0); return { from:ymd(f),to:ymd(l) } }
  if (p === 'last_3m')    return { from: ymd(new Date(y,m-2,1)), to: ymd(now) }
  if (p === 'this_year')  return { from: `${y}-01-01`, to: ymd(now) }
  if (p === 'custom')     return { from: cf||undefined, to: ct||undefined }
  return {}
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000) return `NT$${(n/1000).toFixed(1)}k`
  return `NT$${Math.round(n).toLocaleString()}`
}
function pct(n: number) { return `${(n*100).toFixed(1)}%` }
function today() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default function ReportsPage() {
  const [period, setPeriod]         = useState<Period>('all')
  const [brand, setBrand]           = useState<BrandFilter>('mouchi')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [loading, setLoading]       = useState(true)
  const [data, setData]             = useState<any>(null)

  // Expense state
  const [expenses, setExpenses]     = useState<any[]>([])
  const [showExpForm, setShowExpForm] = useState(false)
  const [expDate, setExpDate]       = useState(today())
  const [expAmt, setExpAmt]         = useState('')
  const [expCat, setExpCat]         = useState('廣告/宣傳')
  const [expNote, setExpNote]       = useState('')
  const [expBrand, setExpBrand]     = useState<BrandFilter>('all')
  const [savingExp, setSavingExp]   = useState(false)

  // Manual record state
  const [showRecForm, setShowRecForm] = useState(false)
  const [recType, setRecType]       = useState<'sale' | 'purchase'>('sale')
  const [recDate, setRecDate]       = useState(today())
  const [recBrand, setRecBrand]     = useState<BrandFilter>('mouchi')
  const [recProduct, setRecProduct] = useState('')
  const [recProductId, setRecProductId] = useState('')
  const [recQty, setRecQty]         = useState('1')
  const [recPrice, setRecPrice]     = useState('')
  const [recCost, setRecCost]       = useState('')
  const [recBuyer, setRecBuyer]     = useState('')
  const [recSupplier, setRecSupplier] = useState('')
  const [recError, setRecError]     = useState('')
  const [recSuccess, setRecSuccess] = useState('')
  const [purchaseLogs, setPurchaseLogs] = useState<any[]>([])
  const [products, setProducts]     = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [savingRec, setSavingRec]   = useState(false)

  const { from, to } = periodDates(period, customFrom, customTo)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ brand })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    try {
      const res  = await fetch(`/api/reports?${params}`)
      const json = await res.json()
      if (json && !json.error) setData(json)
      else setData(null)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [period, brand, from, to])

  const fetchExpenses = useCallback(async () => {
    const params = new URLSearchParams({ brand })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    try {
      const res = await fetch(`/api/expenses?${params}`)
      const json = await res.json()
      if (Array.isArray(json)) setExpenses(json)
    } catch {}
  }, [period, brand, from, to])

  const fetchPurchaseLogs = useCallback(async () => {
    const params = new URLSearchParams({ brand })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    try {
      const res = await fetch(`/api/purchase-logs?${params}`)
      const json = await res.json()
      if (Array.isArray(json)) setPurchaseLogs(json)
    } catch {}
  }, [period, brand, from, to])

  useEffect(() => {
    if (period !== 'custom') { fetchReport(); fetchExpenses(); fetchPurchaseLogs() }
  }, [period, brand])

  // Load products for manual record
  useEffect(() => {
    if (showRecForm && products.length === 0) {
      fetch('/api/products').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setProducts(d) }).catch(()=>{})
    }
  }, [showRecForm])

  async function addExpense() {
    if (!expAmt || !expDate) return
    setSavingExp(true)
    try {
      await fetch('/api/expenses', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ date: expDate, amount: parseFloat(expAmt), category: expCat, note: expNote || null, brand: expBrand }),
      })
      setExpAmt(''); setExpNote(''); setShowExpForm(false)
      fetchReport(); fetchExpenses()
    } finally { setSavingExp(false) }
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    fetchReport(); fetchExpenses()
  }

  async function addRecord() {
    if (!productSearch.trim() || !recQty) return
    setSavingRec(true); setRecError(''); setRecSuccess('')
    try {
      const pid = recProductId || null
      const nameNote = pid ? null : productSearch.trim()
      let res: Response
      if (recType === 'purchase') {
        res = await fetch('/api/purchase-logs', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            product_id: pid,
            brand: recBrand,
            quantity: parseInt(recQty),
            unit_cost: recCost ? parseFloat(recCost) : null,
            supplier: recSupplier || null,
            note: nameNote,
            date: recDate,
          }),
        })
      } else {
        const endpoint = recBrand === 'wholesale' ? '/api/shipment-logs' : '/api/sales-logs'
        const body: any = {
          product_id: pid,
          brand: recBrand,
          quantity: parseInt(recQty),
          unit_price: recPrice ? parseFloat(recPrice) : null,
          created_at: recDate + 'T12:00:00Z',
        }
        if (recBrand === 'mouchi') body.cost_per_unit = recCost ? parseFloat(recCost) : null
        if (recBrand === 'wholesale') body.buyer = recBuyer || null
        res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setRecError(err.error || `儲存失敗（HTTP ${res.status}）`)
        return
      }
      setRecSuccess(`已新增 ${recType === 'purchase' ? '進貨' : '出貨'}記錄`)
      setRecProduct(''); setRecProductId(''); setRecQty('1'); setRecPrice(''); setRecCost(''); setRecBuyer(''); setRecSupplier('')
      setProductSearch('')
      fetchReport(); fetchPurchaseLogs()
      setTimeout(() => setRecSuccess(''), 3000)
    } catch (e: any) {
      setRecError('網路錯誤，請再試一次')
    } finally { setSavingRec(false) }
  }

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return (p.ai_suggested_name||p.product_name||'').toLowerCase().includes(q) || (p.product_code||'').toLowerCase().includes(q)
  }).slice(0, 8)

  const s = data?.summary
  const byMonth: any[] = data?.by_month ?? []
  const topProducts: any[] = data?.top_products ?? []

  const baselineBanner = data?.used_baseline && (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
      <span className="font-semibold">「全部」顯示所有商品的累計估算</span>，月份明細僅顯示系統記錄的出貨。
      點「補記錄」可補入過去的出貨時間，讓月份明細更完整。
    </div>
  )

  // ── Shared sub-components ─────────────────────────────────────────
  const periodTabs = (mobile?: boolean) => (
    <div className={`flex gap-1.5 ${mobile ? 'overflow-x-auto pb-1 no-scrollbar' : 'flex-wrap'}`}>
      {PERIODS.map(p => (
        <button key={p.v} onClick={() => setPeriod(p.v)}
          className={`${mobile ? 'flex-shrink-0' : ''} px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${period === p.v ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
          {p.l}
        </button>
      ))}
    </div>
  )

  const brandTabs = (mobile?: boolean) => (
    <div className={`flex gap-1.5 ${mobile ? '' : 'bg-gray-100 p-1 rounded-xl'}`}>
      {([['all','全部'],['mouchi','MOUCHI零售'],['wholesale','批發倉']] as [BrandFilter,string][]).map(([v,l]) => (
        <button key={v} onClick={() => setBrand(v)}
          className={`${mobile ? 'flex-1 py-1.5 rounded-xl text-xs font-medium' : 'text-xs px-3 py-1.5 rounded-lg font-medium'} transition-all
            ${brand === v ? (mobile ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 shadow-sm') : (mobile ? 'bg-white text-gray-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700')}`}>
          {mobile ? (v==='mouchi'?'零售':v==='wholesale'?'批發':'全部') : l}
        </button>
      ))}
    </div>
  )

  const customRange = (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">從</label>
        <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">到</label>
        <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <button onClick={() => { fetchReport(); fetchExpenses() }} className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">查詢</button>
    </div>
  )

  const expenseSection = (mobile?: boolean) => (
    <div className={`bg-white ${mobile ? 'rounded-2xl border border-gray-100' : 'rounded-2xl border border-gray-100'}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">宣傳 / 其他開銷</h2>
          {s && <p className="text-xs text-gray-400 mt-0.5">合計 {fmt(s.expenses ?? 0)}・淨利 {fmt(s.net_profit ?? s.profit)}</p>}
        </div>
        <button onClick={() => setShowExpForm(v=>!v)}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
          {showExpForm ? '取消' : '+ 新增'}
        </button>
      </div>
      {showExpForm && (
        <div className="px-4 py-3 border-b border-gray-50 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={expDate} onChange={e=>setExpDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            <select value={expBrand} onChange={e=>setExpBrand(e.target.value as BrandFilter)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
              <option value="all">全品牌</option><option value="mouchi">MOUCHI零售</option><option value="wholesale">批發倉</option>
            </select>
            <select value={expCat} onChange={e=>setExpCat(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
              {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="金額 NT$" value={expAmt} onChange={e=>setExpAmt(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
            <input type="text" placeholder="備註（選填）" value={expNote} onChange={e=>setExpNote(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
            <button onClick={addExpense} disabled={savingExp}
              className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50">
              {savingExp ? '…' : '新增'}
            </button>
          </div>
        </div>
      )}
      {expenses.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {expenses.slice(0,10).map((e:any) => (
            <div key={e.id} className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-red-500">-{fmt(e.amount)}</span>
                <span className="text-xs text-gray-400 ml-2">{e.category}</span>
                {e.note && <span className="text-xs text-gray-400 ml-1">· {e.note}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{e.date}</span>
                <button onClick={() => deleteExpense(e.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 text-xs text-gray-400 text-center">尚無開銷記錄</div>
      )}
    </div>
  )

  const recordForm = (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">補入歷史進銷記錄</h2>
          <p className="text-xs text-gray-400 mt-0.5">補入過去的進貨或出貨，讓月份明細更完整</p>
        </div>
        <button onClick={() => setShowRecForm(v=>!v)}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
          {showRecForm ? '收起' : '展開'}
        </button>
      </div>
      {showRecForm && (
        <div className="px-4 py-4 space-y-3">
          {/* Type tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setRecType('sale')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${recType==='sale' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              📤 出貨記錄
            </button>
            <button onClick={() => setRecType('purchase')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${recType==='purchase' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              📥 進貨記錄
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{recType === 'sale' ? '出貨' : '進貨'}日期</label>
              <input type="date" value={recDate} onChange={e=>setRecDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">品牌</label>
              <select value={recBrand} onChange={e=>setRecBrand(e.target.value as BrandFilter)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="mouchi">MOUCHI零售</option>
                <option value="wholesale">批發倉</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">商品（搜尋名稱或編號，找不到可直接輸入）</label>
            <input type="text" placeholder="輸入商品名稱搜尋…" value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setRecProduct(''); setRecProductId('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            {productSearch && !recProductId && filteredProducts.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => {
                    setRecProductId(p.id)
                    setRecProduct(p.ai_suggested_name || p.product_name)
                    setProductSearch(p.ai_suggested_name || p.product_name)
                    if (!recPrice) setRecPrice(String(p.my_selling_price ?? ''))
                    if (!recCost)  setRecCost(String(p.total_cost_with_handling ?? ''))
                  }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700">{p.ai_suggested_name || p.product_name}</span>
                    {p.product_code && <span className="text-xs text-gray-400 ml-2">{p.product_code}</span>}
                  </button>
                ))}
              </div>
            )}
            {recProductId && <p className="text-xs text-green-600 mt-1">✓ 已選：{recProduct}</p>}
            {productSearch && !recProductId && filteredProducts.length === 0 && products.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">找不到符合商品，將以「{productSearch}」為名稱直接存入</p>
            )}
          </div>

          {recType === 'sale' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">數量</label>
                <input type="number" min="1" value={recQty} onChange={e=>setRecQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">售價 NT$</label>
                <input type="number" placeholder="選填" value={recPrice} onChange={e=>setRecPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{recBrand === 'wholesale' ? '買家' : '成本 NT$'}</label>
                {recBrand === 'wholesale'
                  ? <input type="text" placeholder="選填" value={recBuyer} onChange={e=>setRecBuyer(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  : <input type="number" placeholder="選填" value={recCost} onChange={e=>setRecCost(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                }
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">進貨數量</label>
                <input type="number" min="1" value={recQty} onChange={e=>setRecQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">單件進貨成本 NT$</label>
                <input type="number" placeholder="選填" value={recCost} onChange={e=>setRecCost(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">供應商（選填）</label>
                <input type="text" placeholder="例：韓國廠商" value={recSupplier} onChange={e=>setRecSupplier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <button onClick={addRecord} disabled={savingRec || !productSearch.trim()}
            className="w-full py-2.5 bg-gray-800 text-white text-sm rounded-xl hover:bg-gray-700 disabled:opacity-40 font-medium">
            {savingRec ? '儲存中…' : `新增這筆${recType === 'sale' ? '出貨' : '進貨'}記錄`}
          </button>
          {recError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{recError}</p>}
          {recSuccess && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">✓ {recSuccess}</p>}
        </div>
      )}

      {/* 近期進貨記錄清單 */}
      {purchaseLogs.length > 0 && (
        <div className="border-t border-gray-100">
          <p className="px-4 py-2.5 text-xs font-semibold text-gray-500">近期進貨記錄</p>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {purchaseLogs.slice(0, 20).map((r: any) => (
              <div key={r.id} className="px-4 py-2 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {r.products?.ai_suggested_name || r.products?.product_name || r.note || '未知商品'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {r.date} · {r.quantity} 件{r.unit_cost ? ` · NT$${r.unit_cost}/件` : ''}{r.supplier ? ` · ${r.supplier}` : ''}
                  </p>
                </div>
                {r.unit_cost && (
                  <p className="text-xs font-semibold text-blue-600 ml-3">
                    NT${Math.round(r.unit_cost * r.quantity).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Desktop ────────────────────────────────────────────────────────
  const desktopContent = (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">進銷存報表</h1>
          <p className="text-sm text-gray-500 mt-0.5">銷售、利潤、開銷分析</p>
        </div>
        {brandTabs()}
      </div>

      {periodTabs()}
      {period === 'custom' && customRange}

      {loading ? (
        <div className="py-16 text-center text-gray-400">載入中…</div>
      ) : !data ? (
        <div className="py-16 text-center text-gray-400">無資料</div>
      ) : (
        <>
          {baselineBanner}

          {/* Row 1: sales stats */}
          <div className="grid grid-cols-4 gap-4">
            <SumCard label="銷售總額" value={fmt(s.revenue)} sub={`${s.qty} 件出貨`} color="text-gray-800" />
            <SumCard label="已售成本" value={fmt(s.cogs)} color="text-gray-600" />
            <SumCard label="毛利" value={fmt(s.profit)} color={s.profit>=0?'text-green-600':'text-red-500'} />
            <SumCard label="毛利率" value={pct(s.margin)} color={s.margin>=0.3?'text-green-600':s.margin>=0.15?'text-amber-500':'text-red-500'} />
          </div>

          {/* Row 2: procurement + expenses + net profit */}
          <div className="grid grid-cols-4 gap-4">
            <SumCard label="進貨總額（記錄）" value={fmt(s.purchased_amount??0)} sub={`${s.purchased_qty??0} 件入庫`} color="text-blue-600" />
            <SumCard label="宣傳/其他開銷" value={`-${fmt(s.expenses??0)}`} color="text-red-500" sub="已記錄費用" />
            <SumCard label="實際淨利（扣除開銷）" value={fmt(s.net_profit??s.profit)}
              color={(s.net_profit??s.profit)>=0?'text-green-600':'text-red-500'}
              sub={s.revenue>0?`淨利率 ${pct((s.net_profit??s.profit)/s.revenue)}`:undefined} />
            <SumCard label="在庫總值（未售成本）" value={fmt(s.inventory_value??0)} color="text-indigo-600" />
          </div>

          {/* Expense & Record section */}
          <div className="grid grid-cols-2 gap-4">
            {expenseSection()}
            {recordForm}
          </div>

          {/* Monthly breakdown */}
          {byMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">月份明細（已記錄的出貨）</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2.5 text-left font-medium">月份</th>
                    <th className="px-4 py-2.5 text-right font-medium">件數</th>
                    <th className="px-4 py-2.5 text-right font-medium">銷售額</th>
                    <th className="px-4 py-2.5 text-right font-medium">成本</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byMonth.map(row => (
                    <tr key={row.month} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{row.month.replace('-','/')}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{row.qty}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(row.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(row.cogs)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.profit>=0?'text-green-600':'text-red-500'}`}>{fmt(row.profit)}</td>
                      <td className={`px-4 py-3 text-right ${row.margin>=0.3?'text-green-600':row.margin>=0.15?'text-amber-500':'text-red-500'}`}>{pct(row.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">熱銷商品 Top 10</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2.5 text-left font-medium">#</th>
                    <th className="px-4 py-2.5 text-left font-medium">商品</th>
                    <th className="px-4 py-2.5 text-right font-medium">件數</th>
                    <th className="px-4 py-2.5 text-right font-medium">銷售額</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p,i) => (
                    <tr key={p.name} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.qty}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(p.revenue)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${p.profit>=0?'text-green-600':'text-red-500'}`}>{fmt(p.profit)}</td>
                      <td className={`px-4 py-3 text-right ${p.margin>=0.3?'text-green-600':p.margin>=0.15?'text-amber-500':'text-red-500'}`}>{pct(p.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {byMonth.length===0 && topProducts.length===0 && !data.used_baseline && (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm text-gray-400">此期間沒有出貨記錄</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── Mobile ─────────────────────────────────────────────────────────
  const mobileContent = (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <h1 className="text-base font-bold text-gray-800 mb-2">進銷存報表</h1>
        {periodTabs(true)}
      </header>

      <div className="flex gap-1.5 px-4 pt-3">{brandTabs(true)}</div>

      {period === 'custom' && (
        <div className="mx-4 mt-3 bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8">從</span>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8">到</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <button onClick={() => { fetchReport(); fetchExpenses() }} className="w-full py-2 bg-gray-800 text-white text-xs rounded-xl">查詢</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">載入中…</div>
      ) : !data ? null : (
        <div className="px-4 pt-3 space-y-4">
          {data.used_baseline && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
              「全部」顯示所有商品累計估算，月份明細為已記錄出貨。可用「補記錄」補入歷史。
            </div>
          )}

          {/* Sales summary */}
          <div className="grid grid-cols-2 gap-2">
            <MobileCard label="銷售總額" value={fmt(s.revenue)} sub={`${s.qty} 件`} />
            <MobileCard label="已售成本" value={fmt(s.cogs)} dim />
            <MobileCard label="毛利" value={fmt(s.profit)} green={s.profit>=0} red={s.profit<0} />
            <MobileCard label="毛利率" value={pct(s.margin)} green={s.margin>=0.3} red={s.margin<0.15&&s.revenue>0} />
          </div>

          {/* Procurement + expenses + net profit */}
          <div className="grid grid-cols-2 gap-2">
            <MobileCard label="進貨金額（記錄）" value={fmt(s.purchased_amount??0)} sub={`${s.purchased_qty??0} 件`} />
            <MobileCard label="宣傳開銷" value={`-${fmt(s.expenses??0)}`} red />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MobileCard label="實際淨利" value={fmt(s.net_profit??s.profit)} green={(s.net_profit??s.profit)>=0} red={(s.net_profit??s.profit)<0} />
            <MobileCard label="在庫總值" value={fmt(s.inventory_value??0)} indigo />
          </div>

          {/* Expense section */}
          {expenseSection(true)}

          {/* Record form */}
          {recordForm}

          {/* Monthly */}
          {byMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-100">月份明細</p>
              <div className="divide-y divide-gray-50">
                {byMonth.map(row => (
                  <div key={row.month} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{row.month.replace('-','/')}</span>
                      <span className="text-xs text-gray-400">{row.qty} 件</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">銷售 {fmt(row.revenue)} / 成本 {fmt(row.cogs)}</span>
                      <span className={`text-sm font-semibold ${row.profit>=0?'text-green-600':'text-red-500'}`}>
                        {fmt(row.profit)} <span className="text-xs font-normal">({pct(row.margin)})</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-100">熱銷商品 Top 10</p>
              <div className="divide-y divide-gray-50">
                {topProducts.map((p,i) => (
                  <div key={p.name} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-gray-300 w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.qty} 件・{fmt(p.revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${p.profit>=0?'text-green-600':'text-red-500'}`}>{fmt(p.profit)}</p>
                      <p className="text-[10px] text-gray-400">{pct(p.margin)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {byMonth.length===0 && topProducts.length===0 && !data.used_baseline && (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm text-gray-400">此期間沒有出貨記錄</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{desktopContent}</div>
      <div className="lg:hidden">{mobileContent}</div>
    </>
  )
}

function SumCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MobileCard({ label, value, sub, green, red, dim, indigo }: {
  label: string; value: string; sub?: string; green?: boolean; red?: boolean; dim?: boolean; indigo?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-base font-bold leading-tight ${green?'text-green-600':red?'text-red-500':dim?'text-gray-500':indigo?'text-indigo-600':'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
