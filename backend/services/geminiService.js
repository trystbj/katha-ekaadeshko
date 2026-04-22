import { createHttpClient } from '../utils/httpClient.js'

function requireKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is missing')
  return key
}

const SYSTEM_CORE = `You are Katha Ekadeshko backend: ENHANCEMENT & CULTURAL ENGINE.
Rules:
- Do NOT break core story facts.
- Only enhance cultural richness, dialogue quality, immersion, and atmosphere.
- Keep authenticity for the region.
- Return ONLY valid JSON for the requested schema. No markdown. No extra text.`

export async function geminiJson({ purpose, schemaHint, prompt }) {
  const key = requireKey()
  const model = 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`

  const http = createHttpClient({ timeoutMs: 90_000, retries: 2 })
  const raw = await http(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_CORE }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `TASK: ${purpose}\nSCHEMA: ${schemaHint}\n\n${prompt}\n\nReturn ONLY JSON.` }]
        }
      ],
      generationConfig: { temperature: 0.65, maxOutputTokens: 4096 }
    })
  })

  const data = safeJsonParse(raw, `Gemini ${purpose} envelope`)
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || ''
  return safeJsonParse(text, `Gemini ${purpose}`)
}

function safeJsonParse(text, label) {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: invalid JSON response`)
  }
}

