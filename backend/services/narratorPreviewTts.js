/**
 * Fast cinematic TTS for narrator picker — minimal instructions to avoid timeouts.
 */
import { getNarratorPreset } from '../utils/narratorPresets.js'
import { getCinematicPreviewScript } from '../voice/narratorPreviewScripts.js'
import { resolvePreviewLanguage } from '../../core/voice/previewLanguage.js'
import { getLanguageDeliveryBlock } from '../voice/languageDeliveryProfiles.js'
import { resolveOutputLanguageCode } from '../../shared/outputLanguageLock.js'
import { withTimeout } from '../../api/_lib/http.js'
import { safeLog } from '../../api/_lib/log.js'

const MAX_INSTRUCTION_CHARS = 3600

function ttsKeyConfigured() {
  return Boolean(process.env.TTS_API_KEY || process.env.OPENAI_API_KEY)
}

/**
 * @param {string} narratorId
 * @param {{ uiLang?: string, storyLanguage?: string, narrationLanguage?: string }} [options]
 * @returns {Promise<Buffer>}
 */
export async function generateNarratorPreviewMp3(narratorId, options = {}) {
  const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
  if (!key) {
    safeLog('warn', 'narrator-preview TTS key missing', {
      ttsConfigured: false,
      narratorId
    })
    const e = new Error('TTS is not configured. Set TTS_API_KEY or OPENAI_API_KEY.')
    e.status = 503
    e.code = 'TTS_NOT_CONFIGURED'
    throw e
  }

  const preset = getNarratorPreset(narratorId)
  const previewLang = resolvePreviewLanguage({
    storyLanguage: options.storyLanguage,
    narrationLanguage: options.narrationLanguage,
    uiLang: options.uiLang
  })
  const text = getCinematicPreviewScript(narratorId, previewLang, { forApi: true })

  const langBlock = getLanguageDeliveryBlock(resolveOutputLanguageCode(), { extendedPreview: true })

  const instructions = [preset.instructions, langBlock]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_INSTRUCTION_CHARS)

  const baseSpeed = typeof preset.speed === 'number' ? preset.speed : 1
  const previewSpeed = Math.min(1.05, Math.max(0.9, baseSpeed * 0.98))

  const payload = {
    model: 'gpt-4o-mini-tts',
    voice: preset.openAiVoice,
    input: text,
    speed: previewSpeed
  }
  if (instructions) payload.instructions = instructions

  safeLog('warn', 'narrator-preview OpenAI TTS request', {
    narratorId,
    previewLang,
    voice: preset.openAiVoice,
    model: payload.model,
    inputChars: text.length,
    ttsConfigured: ttsKeyConfigured()
  })

  const res = await withTimeout(
    fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }),
    22_000,
    'OpenAI narrator preview'
  )
  if (!res.ok) {
    const t = await res.text()
    safeLog('warn', 'narrator-preview OpenAI TTS failed', {
      narratorId,
      httpStatus: res.status,
      bodyPreview: t.slice(0, 180)
    })
    const e = new Error(t || 'OpenAI TTS failed')
    e.status = res.status === 401 ? 401 : res.status === 429 ? 429 : 502
    e.code = res.status === 401 ? 'TTS_UNAUTHORIZED' : 'TTS_UPSTREAM'
    throw e
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 64) {
    safeLog('warn', 'narrator-preview OpenAI empty audio', { narratorId, bytes: buf.length })
    const e = new Error('OpenAI TTS returned empty audio')
    e.status = 502
    e.code = 'TTS_EMPTY'
    throw e
  }
  safeLog('warn', 'narrator-preview OpenAI TTS ok', {
    narratorId,
    bytes: buf.length,
    voice: preset.openAiVoice
  })
  return buf
}
