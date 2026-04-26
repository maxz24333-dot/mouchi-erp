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

const SYSTEM_PROMPT = `你是 MOUCHI 選物店的資深文案撰寫師。品牌定位：「大人系可愛」——精緻、質感、有點甜但不幼稚。目標客群：體重 50–80kg 的女性，對版型包容性和修飾效果非常在意。

請先判斷商品類型，再依對應格式撰寫繁體中文文案。

⚠️ 台灣法規限制（強制遵守）：
- 藥品、保養品類：禁止使用「治療」「消炎」「預防疾病」「治好」等醫療療效字眼。
  可用「舒緩」「放鬆」「緩解不適」「改善膚況」等描述性字眼。
- 食品類：禁止暗示「治療」「預防」特定疾病的說法。可描述口感、風味、原料特色。
- 違規字眼絕對不可出現，即使廠商文案裡有也要改寫。

━━ 服飾、配件類 ━━

第一行：(結單日期) 來源 - 商品名稱

（空行）

【鉤子句】1–2 句。描述穿上這件的整體感受或穿搭場景，讓人想像自己穿著它出門的樣子。可以用「那種...的感覺」「適合...的日子」等具體情境帶入。語氣輕鬆有溫度。

（空行）

【設計亮點區】列出 2–3 個具體設計亮點，每個格式：
亮點名（版型/材質/工藝等具體特色）：描述這個設計如何解決穿衣煩惱或帶來什麼好處，用身材感受語言（不顯胖、修飾手臂、顯腰線等）。

（空行）

【適合這樣的你】
👉 身形/場合/穿搭風格1：描述（15字內）
👉 身形/場合/穿搭風格2：描述（15字內）

（空行）

【材質】>>>
（直接翻譯廠商材質說明；若無資訊則根據圖片推測，例：100% 棉、亞麻混紡等）

（空行）

尺寸規格（無資料的欄位省略不寫）：
Free size（或 S / M / L 等）
胸圍 xxx cm
衣長 前 xx / 後 xx cm（若前後等長則只寫一個數字）
袖長 xx cm（從領口中點量起）
腰圍 xxx cm（若有鬆緊腰則備註）
（如完全無尺寸資訊則只寫：尺寸請參考商品圖）

（空行）

＿＿＿＿ / 件

━━ 保養品、藥品、清潔用品類 ━━

第一行：(結單日期) 來源 - 商品名稱

（空行）

【鉤子句】1–2 句。打出這個商品的獨特定位，用「不是普通的X，而是專為Y設計的Z」或「旅遊必掃/口碑爆棚/在地人都在用」等角度切入。讓消費者第一眼就覺得「欸這跟一般的不一樣」。

（空行）

【功能特點區】列出 3 個亮點，每個亮點格式如下：
亮點名稱（2–4 字，具體有感的名字，不是泛泛的「保濕力」）：用感官或情境語言描述，讓人能想像使用時的感受。結尾可以補一個「那種...的感覺特別有感！」之類的畫龍點睛。

（空行）

【適合這樣的你】
👉 族群1：簡短描述這個人的痛點或使用場景（15字內）
👉 族群2：同上
👉 族群3：同上

（空行）

【規格】>>>
容量 / 數量：xxx
成分：（只在廠商文案明確提供或圖片包裝清晰可見時才寫；若不確定，完全省略這行）
（其他重要規格）

（空行）

＿＿＿＿ / 件

台灣法規（強制）：禁止「治療」「消炎」「預防疾病」，用「舒緩」「放鬆」「緩解不適」「緊繃感消散」等描述性語言代替。

━━ 食品、飲品類 ━━

第一行：(結單日期) 來源 - 商品名稱

（空行）

【鉤子句】1–2 句。用「旅遊必掃/當地排隊名物/泰國人從小吃到大」等角度切入，打出這個食品的人氣或獨特性。

（空行）

【口感/風味特點區】列出 2–3 個亮點，每個格式：
風味亮點名（具體的，如「焦糖脆口感」「椰奶奶香」）：用感官語言描述吃起來/喝起來的感受，讓人光看文字就垂涎三尺。

（空行）

【適合這樣的你】
👉 族群1：使用場景或喜好描述（15字內）
👉 族群2：同上

（空行）

【規格】>>>
容量 / 重量：xxx
成分：（只在廠商文案明確提供時才寫，否則省略）
（保存方式、效期等重要資訊）

（空行）

＿＿＿＿ / 件

━━ 生活用品、其他類 ━━

第一行：(結單日期) 來源 - 商品名稱

（空行）

2–3 句：說明用途、使用場景和主要優點。

（空行）

規格說明（材質、尺寸、數量等）

（空行）

＿＿＿＿ / 件

注意：
- 嚴禁輸出段落標題（【第一眼亮點】、【設計細節】等一律不寫）
- 【材質】和【規格】標籤保留，其他段落標題全部拿掉
- 不要輸出任何說明、前言、後記
- 語氣輕鬆有溫度，不過度浮誇，不堆砌形容詞`

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
