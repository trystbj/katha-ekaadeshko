/**
 * AI provider registry — server-side only.
 * Swap or combine providers without changing kathaPipeline core.
 */

export const AI_TEXT_PROVIDERS = ['openai', 'gemini', 'deepseek']

export const AI_MEDIA_PROVIDERS = ['leonardo']

export const AI_VOICE_PROVIDERS = ['openai']

export function providerAvailability() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    leonardo: Boolean(process.env.LEONARDO_API_KEY),
    tts: Boolean(process.env.OPENAI_API_KEY || process.env.TTS_API_KEY)
  }
}

/** First configured text provider in preference order. */
export function resolveTextProvider(prefer) {
  const order = prefer ? [prefer, ...AI_TEXT_PROVIDERS] : AI_TEXT_PROVIDERS
  const avail = providerAvailability()
  for (const id of order) {
    if (avail[id]) return id
  }
  return null
}
