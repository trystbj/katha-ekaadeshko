import { openaiJson } from '../services/openaiService.js'
import { geminiJson } from '../services/geminiService.js'

const SCHEMA = '{ "translatedText": string }'

const PROVIDERS = [
  { id: 'openai', hasKey: () => Boolean(process.env.OPENAI_API_KEY), fn: openaiJson },
  { id: 'gemini', hasKey: () => Boolean(process.env.GEMINI_API_KEY), fn: geminiJson }
]

/**
 * Translate story prose for the Story tab reading view.
 * Original English pipeline output is never mutated — callers cache by language code.
 */
export async function translateStoryProse({ text, targetLanguage, sourceLanguage = 'English' }) {
  const body = String(text || '').trim()
  if (!body) throw new Error('Story text is empty')
  const target = String(targetLanguage || '').trim()
  if (!target) throw new Error('Target language is required')

  const prompt = `Translate the following story from ${sourceLanguage} into ${target}.

Rules:
- Preserve paragraph breaks (use \\n\\n between paragraphs).
- Preserve character and place names unless a natural localized form is standard.
- Do not add commentary, titles, or markdown — return only the translated story body in translatedText.
- Keep tone, pacing, and narrative voice faithful to the original.

STORY:
${body}`

  let lastErr = null
  for (const p of PROVIDERS) {
    if (!p.hasKey()) continue
    try {
      const out = await p.fn({
        purpose: 'translate',
        schemaHint: SCHEMA,
        prompt
      })
      const translated = String(out?.translatedText || '').trim()
      if (!translated) throw new Error('Empty translation')
      return translated
    } catch (e) {
      lastErr = e
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Story translation unavailable (no AI provider)')
}
