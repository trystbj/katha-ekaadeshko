/**
 * OpenAI TTS provider — global cinematic narration director + pronunciation preprocessing.
 */

import { randomUUID } from 'crypto'
import { writeFile } from 'fs/promises'
import { getNarratorPreset } from '../../utils/narratorPresets.js'
import { buildGlobalNarrationPlan } from '../cinematicNarrationDirector.js'
import { isNepaliLanguage } from '../nepaliPronunciationEngine.js'

function clampSpeed(n, storyLanguage) {
  if (!Number.isFinite(n)) return 1
  let s = Math.min(1.12, Math.max(0.9, n))
  if (isNepaliLanguage(storyLanguage)) {
    s = Math.min(s, 1.02)
    s = Math.max(s * 0.97, 0.9)
  }
  return s
}

/** @type {import('./VoiceProvider.js').VoiceProvider} */
export const openaiTtsProvider = {
  id: 'openai',
  async synthesize({ text, narratorId, input, scriptRow }) {
    const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
    if (!key) return ''

    const preset = getNarratorPreset(narratorId)
    const plan = buildGlobalNarrationPlan({
      narration: text,
      visualDescription: scriptRow?.visual_description,
      genre: input?.genre,
      theme: input?.theme,
      storyTone: input?.storyTone,
      storyLanguage: input?.storyLanguage,
      styleId: input?.styleId,
      customVisualPrompt: input?.customVisualPrompt,
      narratorId: input?.narratorId,
      seedLine: input?.seedLine,
      autoVoiceDirector: input?.autoVoiceDirector !== false,
      narratorGenderPreference: input?.narratorGenderPreference
    })

    const ttsInput = plan.processedText || text

    const mergedInstructions = [preset.instructions, plan.instructionSuffix]
      .filter(Boolean)
      .join(' ')
      .trim()

    const baseSpeed = typeof preset.speed === 'number' ? preset.speed : 1
    const adapted = clampSpeed(baseSpeed * plan.speedMul, input?.storyLanguage)

    const payload = {
      model: 'gpt-4o-mini-tts',
      voice: preset.openAiVoice,
      format: 'mp3',
      input: ttsInput,
      speed: adapted
    }
    if (mergedInstructions) payload.instructions = mergedInstructions

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
      throw new Error(`OpenAI TTS ${res.status}: ${t}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const id = randomUUID()
    const file = `public/audio/${id}.mp3`
    await writeFile(file, buf)
    return `/public/audio/${id}.mp3`
  }
}

