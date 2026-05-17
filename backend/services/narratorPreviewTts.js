/**
 * Cinematic TTS sample for the narrator picker — same global director as full pipeline.
 */
import { getNarratorPreset } from '../utils/narratorPresets.js'
import { getCinematicPreviewScript } from '../voice/narratorPreviewScripts.js'
import { buildGlobalNarrationPlan } from '../voice/cinematicNarrationDirector.js'
import { resolvePreviewLanguage } from '../../core/voice/previewLanguage.js'

/**
 * @param {string} narratorId
 * @param {{ uiLang?: string, storyLanguage?: string, narrationLanguage?: string }} [options]
 * @returns {Promise<Buffer>}
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
  const text = getCinematicPreviewScript(narratorId, previewLang)

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
    { extendedPreview: true, skipSceneAdapt: false }
  )

  const baseSpeed = typeof preset.speed === 'number' ? preset.speed : 1
  const neSlow = previewLang === 'ne' ? 0.94 : 0.96
  const previewSpeed = Math.min(1.03, Math.max(0.88, baseSpeed * plan.speedMul * neSlow))

  const instructions = [preset.instructions, plan.instructionSuffix]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  const payload = {
    model: 'gpt-4o-mini-tts',
    voice: preset.openAiVoice,
    format: 'mp3',
    input: text,
    speed: previewSpeed
  }
  if (instructions) payload.instructions = instructions

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
