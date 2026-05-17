/**
 * Short TTS sample for the narrator picker (OpenAI, same as full pipeline).
 */
import { getNarratorPreset } from '../utils/narratorPresets.js'
import { getNarratorIntroSampleText } from '../utils/narratorIntroSamples.js'

/**
 * @param {string} narratorId
 * @param {{ uiLang?: string }} [_options] reserved for cache/query parity with `/api/narrator-preview`
 * @returns {Promise<Buffer>}
 */
export async function generateNarratorPreviewMp3(narratorId, _options = {}) {
  const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
  if (!key) {
    const e = new Error('TTS is not configured. Set TTS_API_KEY or OPENAI_API_KEY.')
    e.status = 503
    throw e
  }
  const preset = getNarratorPreset(narratorId)
  const text = getNarratorIntroSampleText(narratorId)
  let instructions = String(preset.instructions || '')
  instructions +=
    ' Read this Nepali sample clearly with native Nepali vowels and stress; keep the narrator persona defined above.'
  const payload = {
    model: 'gpt-4o-mini-tts',
    voice: preset.openAiVoice,
    format: 'mp3',
    input: text,
    speed: typeof preset.speed === 'number' ? preset.speed : 1
  }
  if (instructions.trim()) payload.instructions = instructions

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const t = await res.text()
    const e = new Error(t || 'OpenAI TTS failed')
    e.status = 502
    throw e
  }
  return Buffer.from(await res.arrayBuffer())
}
