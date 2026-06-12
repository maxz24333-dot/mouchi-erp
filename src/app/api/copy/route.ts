import { NextRequest, NextResponse } from 'next/server'

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

const SOURCE_LABEL: Record<string, string> = {
  thailand: '曼谷設計',
  haido:    '日牌（海度）',
  mdm:      '日牌（MDM）',
  sd:       '日牌（SD）',
  korea:    '韓國',
  other:    '其他',
}

const SYSTEM_PROMPT = `你是專業翻譯潤飾師。任務是將廠商提供的原文（日文、韓文、泰文、英文等任何語言）翻譯成自然通順的繁體中文，並稍作潤飾讓文字更易讀。

規則：
1. 忠實呈現原文內容，不要自行增加沒有的資訊
2. 翻譯要通順自然，不要像機器翻譯
3. 保留原文的結構與段落
4. 尺寸、規格、成分等數據照實翻譯，不要省略
5. 台灣法規：若原文有「治療」「消炎」「預防疾病」等醫療療效字眼，改為「舒緩」「放鬆」「緩解不適」等描述性語言
6. 只輸出翻譯後的文字，不要加任何說明或前言`

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

    const body = await req.json()
    const { image, imageMimeType, supplierCopy, productName, source } = body

    const sourceLabel = SOURCE_LABEL[source] ?? source ?? ''
    let userPrompt = SYSTEM_PROMPT + '\n\n'
    if (productName) userPrompt += `商品名稱：${productName}\n`
    if (sourceLabel) userPrompt += `商品來源：${sourceLabel}\n`
    if (supplierCopy) userPrompt += `\n廠商提供的原文文案（請翻譯並融入，但務必改掉違規療效字眼）：\n${supplierCopy}\n`
    userPrompt += image
      ? '\n請仔細觀察圖片中的商品，判斷類型後撰寫文案。'
      : '\n請根據以上資訊判斷商品類型後撰寫文案。'

    const parts: object[] = []
    if (image) parts.push({ inlineData: { data: image, mimeType: imageMimeType || 'image/jpeg' } })
    parts.push({ text: userPrompt })
    const contents = [{ parts }]

    let res: Response | undefined, lastErr: unknown
    for (const model of MODELS) {
      const generationConfig = model.startsWith('gemini-2.5')
        ? { temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } }
        : { temperature: 0.7 }
      try {
        res = await callGemini(model, { contents, generationConfig }, apiKey)
      } catch (e) { lastErr = e; continue }
      if (res.ok) break
      lastErr = new Error(`${model} ${res.status}`)
      if (![429, 503, 504].includes(res.status)) break
    }

    if (!res?.ok) throw lastErr || new Error('Gemini unavailable')

    const data = await res.json()
    const copy = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
    if (!copy) throw new Error('Empty response')
    return NextResponse.json({ copy })
  } catch (err) {
    console.error('Copy generation error:', err)
    return NextResponse.json({ error: 'Copy generation failed' }, { status: 500 })
  }
}
