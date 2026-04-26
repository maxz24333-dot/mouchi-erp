import { NextRequest, NextResponse } from 'next/server'

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

async function callGemini(model: string, body: object, apiKey: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

    const formData = await req.formData()
    const file = formData.get('image') as File
    if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const contents = [{
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: `你是 MOUCHI 選物店的商品命名專家。

請仔細觀察這個商品，判斷商品類型，生成一個【台灣電商販售名】。

共同規則：
1. 10–18 個中文字
2. 具備 SEO 搜尋價值，讓人一眼知道是什麼商品
3. 不可加主觀形容詞（禁止：甜美、顯瘦、百搭、減齡、可愛等）

依商品類型的命名重點：
・服飾配件：來源風格 + 材質/工藝 + 版型/領型/袖型 + 品類（例：日系棉麻寬版圓領短袖上衣）
・保養品、藥品：若有知名品牌名則放最前面，再加功效描述 + 品類（例：泰國Counterpain舒緩肌肉痠痛止痛膏）
・食品飲品：產地/風格 + 口味/特色 + 品類（例：泰國進口香蘭葉風味椰糖餅乾）
・生活用品：特色 + 材質/產地 + 品類（例：日本製竹纖維速乾輕薄浴巾）

只回傳商品名稱，不要任何其他文字。` },
      ],
    }]

    let res: Response | undefined, lastErr: unknown
    for (const model of MODELS) {
      const generationConfig = model.startsWith('gemini-2.5')
        ? { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }
        : { temperature: 0.1 }
      try {
        res = await callGemini(model, { contents, generationConfig }, apiKey)
      } catch (e) { lastErr = e; continue }
      if (res.ok) break
      lastErr = new Error(`${model} ${res.status}`)
      if (![429, 503, 504].includes(res.status)) break
    }

    if (!res?.ok) throw lastErr || new Error('Gemini unavailable')

    const data = await res.json()
    const name = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
    if (!name) throw new Error('Empty response')
    return NextResponse.json({ name })
  } catch (err) {
    console.error('AI name error:', err)
    return NextResponse.json({ error: 'AI naming failed' }, { status: 500 })
  }
}
