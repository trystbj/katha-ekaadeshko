import { normalizeNarratorId } from './narratorVoiceEngine.js'

/**
 * Fixed Nepali intro lines for narrator preview TTS — same preset/voice as full-video narration.
 * Keep in sync with `src/renderer/src/constants/narratorIntroSamples.ts` (display + browser fallback).
 */

/** @type {Record<string, string>} */
export const NARRATOR_INTRO_SAMPLE_NE = {
  tryst_bj:
    'नमस्ते, म तपाईँको कथाको साथी। आज हामी एक रोमाञ्चक यात्रामा जाँदै छौँ।',
  penguin:
    'समयको पारि, कल्पनाको संसारमा। एउटा अद्भुत कथा तपाईँलाई पर्खँदै छ।'
}

/**
 * @param {string} narratorId
 * @returns {string}
 */
export function getNarratorIntroSampleText(narratorId) {
  const id = normalizeNarratorId(narratorId)
  const text = NARRATOR_INTRO_SAMPLE_NE[id]
  if (!text) throw new Error(`Unknown narrator intro: ${id}`)
  return text
}
