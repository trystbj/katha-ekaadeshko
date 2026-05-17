import { normalizeNarratorId } from './narratorVoiceEngine.js'
import { getCinematicPreviewScript } from '../voice/narratorPreviewScripts.js'
import { resolvePreviewLanguage } from '../../core/voice/previewLanguage.js'

/**
 * Cinematic intro for narrator preview — sync with `src/renderer/src/constants/narratorIntroSamples.ts`.
 * @param {string} narratorId
 * @param {string} [languageCode] story / narration language (BCP-47 or id)
 */
export function getNarratorIntroSampleText(narratorId, languageCode = 'ne') {
  const id = normalizeNarratorId(narratorId)
  const lang = resolvePreviewLanguage({ storyLanguage: languageCode })
  const text = getCinematicPreviewScript(id, lang)
  if (!text) throw new Error(`Unknown narrator intro: ${id}`)
  return text
}
