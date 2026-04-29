import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ── 幣別換算 TWD ─────────────────────────────────────────────────────

const CURRENCY_RATE: Record<string, number> = {
  '¥': 0.23, '￥': 0.23, 'JPY': 0.23,
  '฿': 1.19, 'THB': 1.19,
  '₩': 0.024, 'KRW': 0.024,
  'NT$': 1.0, 'NTD': 1.0, 'TWD': 1.0,
  '$': 1.0,
}

function toTWD(value: number, currency: string): number {
  const rate = CURRENCY_RATE[currency.trim()] ?? 0
  return rate > 0 ? Math.round(value * rate) : 0
}

// ── R2 上傳 ──────────────────────────────────────────────────────────

async function uploadForLens(base64: string, mimeType: string): Promise<string | null> {
  try {
    const accountId       = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId     = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket          = process.env.R2_BUCKET_NAME
    const publicDomain    = process.env.R2_PUBLIC_DOMAIN
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicDomain) return null

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
    const key = `analysis/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key,
      Body: Buffer.from(base64, 'base64'),
      ContentType: mimeType,
      CacheControl: 'public, max-age=3600',
    }))
    return `${publicDomain}/${key}`
  } catch { return null }
}

// ── Gemini 品牌判斷 ──────────────────────────────────────────────────

interface BrandInfo {
  isBranded: boolean
  brandName: string | null
  searchQuery: string
}

async function detectBrand(base64: string, mimeType: string): Promise<BrandInfo> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { isBranded: false, brandName: null, searchQuery: '' }
  try {
    const body = {
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: `分析此商品圖片。判斷：
1. 是否有明確可識別的品牌名稱（如 Counterpain、Nivea、資生堂、Lotte 等知名品牌）？
2. 若有品牌，品牌名稱和商品名稱是什麼？
3. 生成一個繁體中文搜尋關鍵字（適合在台灣電商搜尋此商品，若有品牌則包含品牌名）

回傳 JSON（只有 JSON，無其他文字）：
{"isBranded":true或false,"brandName":"品牌名或null","searchQuery":"搜尋關鍵字"}` },
        ],
      }],
      generationConfig: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) return { isBranded: false, brandName: null, searchQuery: '' }
    const data = await res.json()
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
    const json = JSON.parse(text.replace(/```[\w]*\n?|\n?```/g, '').trim())
    return {
      isBranded: !!json.isBranded,
      brandName: typeof json.brandName === 'string' && json.brandName !== 'null' ? json.brandName : null,
      searchQuery: typeof json.searchQuery === 'string' ? json.searchQuery : '',
    }
  } catch { return { isBranded: false, brandName: null, searchQuery: '' } }
}

// ── 電商搜尋（品牌關鍵字） ──────────────────────────────────────────

async function brandedEcommerceSearch(
  query: string, serperKey: string, minPrice: number
): Promise<{ prices: number[]; count: number }> {
  try {
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'tw', hl: 'zh-tw', num: 10 }),
    })
    if (!res.ok) return { prices: [], count: 0 }
    const data = await res.json()
    const prices: number[] = []
    for (const item of data.shopping ?? []) {
      const raw: string = item.price ?? ''
      const m = raw.match(/([\d,]+)/)
      if (!m) continue
      const val = parseInt(m[1].replace(/,/g, ''))
      const cur = raw.replace(/[\d,.\s]/g, '').trim() || 'NT$'
      const twd = toTWD(val, cur)
      if (twd >= minPrice && twd < 50000) prices.push(twd)
    }
    return { prices, count: data.shopping?.length ?? 0 }
  } catch { return { prices: [], count: 0 } }
}

// ── 社群搜尋 ────────────────────────────────────────────────────────

async function socialCommerceSearch(
  query: string, serperKey: string
): Promise<{ prices: number[]; count: number }> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: `${query} (賣場 OR 社團 OR IG OR 臉書 OR 露天 OR 旋轉)`,
        gl: 'tw', hl: 'zh-tw', num: 10,
      }),
    })
    if (!res.ok) return { prices: [], count: 0 }
    const data = await res.json()
    const prices: number[] = []
    for (const item of data.organic ?? []) {
      const text = [item.title, item.snippet].filter(Boolean).join(' ')
      for (const m of text.matchAll(/NT\$\s*([\d,]+)|(\d{3,5})\s*元|\$\s*([\d,]+)/g)) {
        const raw = m[1] || m[2] || m[3]
        if (!raw) continue
        const val = parseInt(raw.replace(/,/g, ''))
        if (val >= 50 && val < 50000) prices.push(val)
      }
    }
    return { prices, count: data.organic?.length ?? 0 }
  } catch { return { prices: [], count: 0 } }
}

// ── SerpApi Google Lens ──────────────────────────────────────────────

async function serpApiLens(imageUrl: string, apiKey: string, gl: string, minPrice = 350): Promise<number[]> {
  try {
    const hl = gl === 'jp' ? 'ja' : gl === 'th' ? 'th' : gl === 'kr' ? 'ko' : 'zh-tw'
    const params = new URLSearchParams({ engine: 'google_lens', url: imageUrl, api_key: apiKey, gl, hl })
    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    const prices: number[] = []
    for (const item of data.visual_matches ?? []) {
      const val = item.price?.extracted_value
      const cur = item.price?.currency
      if (!val || !cur) continue
      const twd = toTWD(val, cur)
      if (twd >= minPrice && twd < 50000) prices.push(twd)
    }
    return prices
  } catch { return [] }
}

async function serpApiLensKeywords(imageUrl: string, apiKey: string, gl: string): Promise<string[]> {
  try {
    const hl = gl === 'jp' ? 'ja' : gl === 'th' ? 'th' : gl === 'kr' ? 'ko' : 'zh-tw'
    const params = new URLSearchParams({ engine: 'google_lens', url: imageUrl, api_key: apiKey, gl, hl })
    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.visual_matches ?? [])
      .slice(0, 5)
      .map((m: { title?: unknown }) => (typeof m.title === 'string' ? m.title.slice(0, 60) : ''))
      .filter(Boolean)
  } catch { return [] }
}

async function shoppingSearch(query: string, serperKey: string, gl: string, minPrice = 350): Promise<number[]> {
  try {
    const hl = gl === 'jp' ? 'ja' : gl === 'th' ? 'th' : gl === 'kr' ? 'ko' : 'zh-tw'
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl, hl, num: 10 }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const prices: number[] = []
    for (const item of data.shopping ?? []) {
      const raw: string = item.price ?? ''
      const m = raw.match(/([\d,]+)/)
      if (!m) continue
      const val = parseInt(m[1].replace(/,/g, ''))
      const cur = raw.replace(/[\d,.\s]/g, '').trim() || '$'
      const twd = toTWD(val, cur)
      if (twd >= minPrice && twd < 50000) prices.push(twd)
    }
    return prices
  } catch { return [] }
}

// ── 來源設定 ─────────────────────────────────────────────────────────

const SOURCE_GL: Record<string, string> = {
  thailand: 'th',
  haido: 'jp', mdm: 'jp', sd: 'jp',
  korea: 'kr',
  other: 'tw',
}

const SOURCE_MIN_PRICE: Record<string, number> = {
  thailand: 100,
  haido: 350, mdm: 350, sd: 350,
  korea: 100,
  other: 100,
}

// ── 統計 ─────────────────────────────────────────────────────────────

interface PriceStats { low: number; high: number; avg: number }

function computePriceStats(raw: number[]): PriceStats | null {
  if (raw.length === 0) return null
  const prices = [...new Set(raw)].sort((a, b) => a - b)
  const n = prices.length

  if (n < 3) {
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / n)
    return { low: prices[0], high: prices[n - 1], avg }
  }

  const q1  = prices[Math.floor(n * 0.25)]
  const q3  = prices[Math.floor(n * 0.75)]
  const iqr = q3 - q1
  const filtered = prices.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr)
  const final = filtered.length >= 3 ? filtered : prices

  const displayLow  = final[Math.floor(final.length * 0.25)]
  const displayHigh = final[Math.floor(final.length * 0.75)]
  const avg = Math.round(final.reduce((s, p) => s + p, 0) / final.length)
  return { low: displayLow, high: displayHigh, avg }
}

function computeLifecycle(sellerCount: number): {
  stage: string; stageAdvice: string; suggestedMultiplier: number
} {
  if (sellerCount <= 3)       return { stage: '🌱 導入期', stageAdvice: '利潤品', suggestedMultiplier: 1.18 }
  else if (sellerCount <= 8)  return { stage: '📈 成長期', stageAdvice: '利潤品', suggestedMultiplier: 1.08 }
  else if (sellerCount <= 15) return { stage: '🔄 成熟期', stageAdvice: '引流品', suggestedMultiplier: 1.0 }
  else                        return { stage: '📉 飽和期', stageAdvice: '建議放棄', suggestedMultiplier: 0.92 }
}

// ── Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const serperKey  = process.env.SERPER_API_KEY
    const serpApiKey = process.env.SERPAPI_API_KEY
    if (!serperKey && !serpApiKey) return NextResponse.json({ low: null, high: null, avg: null })

    const formData = await req.formData()
    const file = formData.get('image') as File
    if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const source    = (formData.get('source') as string | null) ?? 'other'
    const primaryGl = SOURCE_GL[source] ?? 'tw'
    const minPrice  = SOURCE_MIN_PRICE[source] ?? 100

    const bytes    = await file.arrayBuffer()
    const base64   = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // 並行：R2 上傳 + 品牌判斷
    const [imageUrl, brandInfo] = await Promise.all([
      uploadForLens(base64, mimeType),
      detectBrand(base64, mimeType),
    ])

    if (!imageUrl) return NextResponse.json({ low: null, high: null, avg: null, stage: '市場資料不足' })
    console.log('[Market] brand:', JSON.stringify(brandInfo))

    // ── 電商搜尋 ──────────────────────────────────────────────────────
    const ecommercePrices: number[] = []
    let ecommerceCount = 0

    if (brandInfo.isBranded && brandInfo.searchQuery && serperKey) {
      // 品牌商品：精確關鍵字搜尋
      const result = await brandedEcommerceSearch(brandInfo.searchQuery, serperKey, minPrice)
      ecommercePrices.push(...result.prices)
      ecommerceCount = result.count
    } else if (serpApiKey) {
      // 類似品項：以圖搜圖
      const lensSearches: Promise<number[]>[] = [serpApiLens(imageUrl, serpApiKey, 'tw', minPrice)]
      if (primaryGl !== 'tw') lensSearches.push(serpApiLens(imageUrl, serpApiKey, primaryGl, minPrice))
      const lensResults = await Promise.all(lensSearches)
      lensResults.forEach(r => ecommercePrices.push(...r))

      // 圖搜不足時補搜來源國 Shopping
      if (ecommercePrices.length < 5 && serperKey) {
        const kws = await serpApiLensKeywords(imageUrl, serpApiKey, primaryGl)
        const shopResults = await Promise.all(
          kws.slice(0, 3).map(kw => shoppingSearch(kw, serperKey, primaryGl, minPrice))
        )
        shopResults.forEach(r => ecommercePrices.push(...r))
      }
      ecommerceCount = ecommercePrices.length
    }

    // ── 社群搜尋（僅品牌商品有查詢詞時執行） ─────────────────────────
    let socialPrices: number[] = []
    let socialCount = 0

    const socialQuery = brandInfo.searchQuery
    if (serperKey && socialQuery) {
      const result = await socialCommerceSearch(socialQuery, serperKey)
      socialPrices = result.prices
      socialCount  = result.count
    }

    console.log('[Market] ecommerce:', JSON.stringify(ecommercePrices), 'count:', ecommerceCount)
    console.log('[Market] social:', JSON.stringify(socialPrices), 'count:', socialCount)

    // ── 統計 & 生命週期 ───────────────────────────────────────────────
    const eStats = computePriceStats(ecommercePrices)
    const sStats = computePriceStats(socialPrices)

    const totalSellerCount = ecommerceCount + Math.floor(socialCount / 2)
    const lifecycle = (eStats && brandInfo.isBranded)
      ? computeLifecycle(totalSellerCount)
      : { stage: null, stageAdvice: null, suggestedMultiplier: 1.0 }

    return NextResponse.json({
      low:            eStats?.low  ?? null,
      high:           eStats?.high ?? null,
      avg:            eStats?.avg  ?? null,
      ecommerceCount,
      socialLow:      sStats?.low  ?? null,
      socialHigh:     sStats?.high ?? null,
      socialAvg:      sStats?.avg  ?? null,
      socialCount,
      isBranded:      brandInfo.isBranded,
      brandName:      brandInfo.brandName,
      ...lifecycle,
    })
  } catch (err) {
    console.error('Market price error:', err)
    return NextResponse.json({ low: null, high: null, avg: null })
  }
}
