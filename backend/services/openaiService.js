import { createHttpClient } from '../utils/httpClient.js'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function requireKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is missing')
  return key
}

const SYSTEM_CORE = `You are Katha Ekadeshko backend: CREATIVE + STRUCTURE ENGINE.
You must produce 100% original content.
You must not copy or imitate existing copyrighted works, franchises, or recognizable characters.
You must avoid repetition and keep strict logical consistency.
You must return ONLY valid JSON for the requested schema. No markdown fences. No extra text.`

export async function openaiJson({ purpose, schemaHint, prompt }) {
  const key = requireKey()
  const http = createHttpClient({ timeoutMs: 90_000, retries: 2 })
  const raw = await http(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: purpose === 'validate' ? 0.2 : 0.85,
      max_tokens: purpose === 'script' ? 4096 : 3072,
      messages: [
        { role: 'system', content: SYSTEM_CORE },
        {
          role: 'user',
          content: `TASK: ${purpose}\nSCHEMA: ${schemaHint}\n\n${prompt}\n\nReturn ONLY JSON.`
        }
      ]
    })
  })
  const data = safeJsonParse(raw, `OpenAI ${purpose} envelope`)
  const text = data?.choices?.[0]?.message?.content?.trim() || ''
  return safeJsonParse(text, `OpenAI ${purpose}`)
}

function safeJsonParse(text, label) {
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`${label}: invalid JSON response`)
  }
}

