/**
 * TTS provider registry — select via TTS_PROVIDER env (default openai).
 */

import { openaiTtsProvider } from './openaiTtsProvider.js'

const PROVIDERS = {
  openai: openaiTtsProvider,
  disabled: null
}

/**
 * @param {string} [id]
 * @returns {import('./VoiceProvider.js').VoiceProvider | null}
 */
export function getVoiceProvider(id) {
  const key = String(id || process.env.TTS_PROVIDER || 'openai').toLowerCase()
  if (key === 'disabled') return null
  return PROVIDERS[key] || PROVIDERS.openai
}
