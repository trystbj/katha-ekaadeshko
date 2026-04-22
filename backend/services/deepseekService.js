import { createHttpClient } from '../utils/httpClient.js'

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function requireKey() {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is missing')
  return key
}

const SYSTEM_CORE = `You are Katha Ekadeshko backend: LOGIC & CONSISTENCY ENGINE.
Rules:
- DO NOT rewrite creatively.
- Only fix plot holes, timeline issues, contradictions, and redundancy.
- Preserve meaning, tone, characters, and culture.
- Return ONLY valid JSON for the requested schema. No markdown. No extra text.`

export async function deepseekJson({ purpose, schemaHint, prompt }) {
  const key = requireKey()
  const http = createHttpClient({ timeoutMs: 90_000, retries: 2 })
  const raw = await http(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 3072,
      messages: [
        { role: 'system', content: SYSTEM_CORE },
        {
          role: 'user',
          content: `TASK: ${purpose}\nSCHEMA: ${schemaHint}\n\n${prompt}\n\nReturn ONLY JSON.`
        }
      ]
    })
  })
  const data = safeJsonParse(raw, `DeepSeek ${purpose} envelope`)
  const text = data?.choices?.[0]?.message?.content?.trim() || ''
  return safeJsonParse(text, `DeepSeek ${purpose}`)
}

function safeJsonParse(text, label) {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: invalid JSON response`)
  }
}

