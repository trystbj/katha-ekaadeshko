/**
 * OpenAI TTS provider — uses voice director delivery plan; no provider logic in pipeline.
 */

import { randomUUID } from 'crypto'
import { writeFile } from 'fs/promises'
import { getNarratorPreset } from '../../utils/narratorPresets.js'
import { buildVoiceDirection } from '../voiceDirector.js'

function clampSpeed(n) {
  if (!Number.isFinite(n)) return 1
  return Math.min(1.14, Math.max(0.82, n))
}

/** @type {import('./VoiceProvider.js').VoiceProvider} */
export const openaiTtsProvider = {
  id: 'openai',
  async synthesize({ text, narratorId, input, scriptRow }) {
    const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
    if (!key) return ''

    const preset = getNarratorPreset(narratorId)
    const direction = buildVoiceDirection({
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

    const mergedInstructions = [preset.instructions, direction.instructionSuffix]
      .filter(Boolean)
      .join(' ')
      .trim()

    const baseSpeed = typeof preset.speed === 'number' ? preset.speed : 1
    const adapted = clampSpeed(baseSpeed * direction.speedMul)

    const payload = {
      model: 'gpt-4o-mini-tts',
      voice: preset.openAiVoice,
      format: 'mp3',
      input: text,
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
