/**
 * Two signature OpenAI TTS narrator presets — IDs sync with `src/renderer/src/constants/narrators.ts`.
 * Implementation lives in `narratorVoiceEngine.js` (voice profiles + scene adaptation hooks).
 */

export {
  NARRATOR_IDS,
  NARRATOR_PRESETS,
  normalizeNarratorId,
  getNarratorPreset,
  getNarratorVoiceProfile
} from './narratorVoiceEngine.js'
