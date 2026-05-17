/**
 * Cinematic TTS sample for the narrator picker — same global director as full pipeline.
 */
import { getNarratorPreset } from '../utils/narratorPresets.js'
import { getCinematicPreviewScript } from '../voice/narratorPreviewScripts.js'
import { buildGlobalNarrationPlan } from '../voice/cinematicNarrationDirector.js'
import { resolvePreviewLanguage } from '../../core/voice/previewLanguage.js'
import { withTimeout } from '../utils/withTimeout.js'

const PREVIEW_INSTRUCTION_MAX = 2200
const OPENAI_TIMEOUT_MS = process.env.VERCEL ? 9_000 : 25_000

/** @param {string} narratorId */
function voiceFallbacks(narratorId) {
  const preset = getNarratorPreset(narratorId)
  const primary = preset.openAiVoice
  if (preset.id === 'penguin') {
    return [...new Set([primary, 'nova', 'shimmer', 'fable'])]
  }
  return [...new Set([primary, 'ash', 'echo', 'onyx'])]
}

/**
 * @param {string} narratorId
 * @param {{ uiLang?: string, storyLanguage?: string, narrationLanguage?: string }} [options]
 * @returns {Promise<{ buf: Buffer, openAiVoice: string }>}
 */
export async function generateNarratorPreviewMp3(narratorId, options = {}) {
  const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
  if (!key) {
    const e = new Error('TTS is not configured. Set TTS_API_KEY or OPENAI_API_KEY.')
    e.status = 503
    throw e
  }

  const preset = getNarratorPreset(narratorId)
  const previewLang = resolvePreviewLanguage({
    storyLanguage: options.storyLanguage,
    narrationLanguage: options.narrationLanguage,
    uiLang: options.uiLang
  })
  const text = getCinematicPreviewScript(narratorId, previewLang, { forApi: true })

  const plan = buildGlobalNarrationPlan(
    {
      narration: text,
      storyLanguage: previewLang,
      narratorId,
      autoVoiceDirector: true,
      genre: 'fantasy',
      storyTone: 'warm',
      styleId: 'cinematic_anime'
    },
    { extendedPreview: false, skipSceneAdapt: true }
  )

  const baseSpeed = typeof preset.speed === 'number' ? preset.speed : 1
  const neSlow = previewLang === 'ne' ? 0.94 : 0.96
  const previewSpeed = Math.min(1.03, Math.max(0.88, baseSpeed * plan.speedMul * neSlow))

  const voiceLock =
    preset.id === 'penguin'
      ? 'OPENAI VOICE LOCK: speak as a woman — light sweet feminine timbre only; never masculine.'
      : 'OPENAI VOICE LOCK: speak as an adult man — clearly masculine baritone; never female or androgynous timbre.'

  const instructions = [voiceLock, preset.instructions, plan.instructionSuffix]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_INSTRUCTION_MAX)

  const voices = voiceFallbacks(narratorId)
  let lastErr = null

  for (const voice of voices) {
    const payload = {
      model: 'gpt-4o-mini-tts',
      voice,
      format: 'mp3',
      input: text,
      speed: previewSpeed
    }
    if (instructions) payload.instructions = instructions

    try {
      const res = await withTimeout(
        fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }),
        OPENAI_TIMEOUT_MS,
        'OpenAI narrator preview'
      )
      if (!res.ok) {
        const t = await res.text()
        lastErr = new Error(t || `OpenAI TTS failed (${res.status})`)
        if (res.status === 400 || res.status === 422) continue
        lastErr.status = 502
        throw lastErr
      }
      return { buf: Buffer.from(await res.arrayBuffer()), openAiVoice: voice }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (voice !== voices[voices.length - 1]) continue
    }
  }

  const e = lastErr instanceof Error ? lastErr : new Error('OpenAI TTS failed')
  if (!e.status) e.status = 502
  throw e
}
