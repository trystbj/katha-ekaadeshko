/**
 * TTS service (pluggable).
 *
 * Default: OpenAI TTS via voice provider registry (requires TTS_API_KEY or OPENAI_API_KEY).
 * Swap provider with TTS_PROVIDER env — implement new providers under backend/voice/providers/.
 */

import { getVoiceProvider } from '../voice/providers/registry.js'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function ttsGenerateForScript({ script, input, req }) {
  // Serverless default: no local file writes; keep free tier simple.
  if (process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1') return []
  const provider = getVoiceProvider()
  if (!provider) return []

  const out = []
  for (const s of script) {
    const narration = String(s.narration || '').trim()
    if (!narration) continue
    try {
      const audio_url = await ttsOne({ text: narration, input, req, scene: s.scene, scriptRow: s })
      if (audio_url) out.push({ scene: s.scene, audio_url })
    } catch (e) {
      // TTS is optional. If the provider is quota-limited or blocked, skip audio instead of failing the whole pipeline.
      const msg = e instanceof Error ? e.message : String(e)
      if (
        msg.includes(' 401:') ||
        msg.includes(' 403:') ||
        msg.includes(' 429:') ||
        msg.includes('insufficient_quota') ||
        msg.toLowerCase().includes('quota')
      ) {
        return out
      }
      throw e
    }
    await sleep(50)
  }
  return out
}

async function ttsOne({ text, input, scriptRow }) {
  const provider = getVoiceProvider()
  if (!provider) return ''
  return provider.synthesize({
    text,
    narratorId: input?.narratorId,
    input,
    scriptRow
  })
}
