type Keys = { openai?: string; gemini?: string; deepseek?: string }

type CompletePayload = {
  system: string
  user: string
  preferProvider?: 'openai' | 'gemini' | 'deepseek'
  maxTokens?: number
}

type CompleteResult = { text: string; provider: string; model: string }

const usage: Record<string, { fails: number; lastFail: number }> = {}

function markFail(provider: string): void {
  const u = usage[provider] || { fails: 0, lastFail: 0 }
  u.fails += 1
  u.lastFail = Date.now()
  usage[provider] = u
}

function shouldSkip(provider: string): boolean {
  const u = usage[provider]
  if (!u || u.fails < 3) return false
  return Date.now() - u.lastFail < 60_000
}

async function openaiComplete(
  key: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<CompleteResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.85,
      max_tokens: maxTokens
    })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`OpenAI: ${res.status} ${t}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  return { text, provider: 'openai', model: 'gpt-4o-mini' }
}

async function geminiComplete(
  key: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<CompleteResult> {
  const model = 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: maxTokens
      }
    })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Gemini: ${res.status} ${t}`)
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const parts = data.candidates?.[0]?.content?.parts
  const text = parts?.map((p) => p.text || '').join('').trim() || ''
  return { text, provider: 'gemini', model }
}

async function deepseekComplete(
  key: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<CompleteResult> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.85,
      max_tokens: maxTokens
    })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`DeepSeek: ${res.status} ${t}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  return { text, provider: 'deepseek', model: 'deepseek-chat' }
}

export async function aiComplete(keys: Keys, payload: CompletePayload): Promise<CompleteResult> {
  const maxTokens = Math.min(Math.max(payload.maxTokens ?? 4096, 256), 8192)
  const { system, user, preferProvider } = payload

  const order: ('openai' | 'gemini' | 'deepseek')[] =
    preferProvider === 'gemini'
      ? ['gemini', 'openai', 'deepseek']
      : preferProvider === 'deepseek'
        ? ['deepseek', 'openai', 'gemini']
        : ['openai', 'gemini', 'deepseek']

  const tryProvider = async (name: 'openai' | 'gemini' | 'deepseek'): Promise<CompleteResult | null> => {
    if (shouldSkip(name)) return null
    try {
      if (name === 'openai' && keys.openai) {
        return await openaiComplete(keys.openai, system, user, maxTokens)
      }
      if (name === 'gemini' && keys.gemini) {
        return await geminiComplete(keys.gemini, system, user, maxTokens)
      }
      if (name === 'deepseek' && keys.deepseek) {
        return await deepseekComplete(keys.deepseek, system, user, maxTokens)
      }
    } catch {
      markFail(name)
    }
    return null
  }

  for (const p of order) {
    const r = await tryProvider(p)
    if (r) return r
  }

  throw new Error(
    'No AI provider available. Add at least one API key (OpenAI, Gemini, or DeepSeek) in api-keys.local.env.'
  )
}
