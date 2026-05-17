/**
 * Narration orchestration — per-scene delivery plan synced to timeline.
 */

import { buildVoiceDirection } from '../../voice/voiceDirector.js'
import { buildVoiceProfile, summarizeVoiceProfileForBlueprint } from '../../voice/voiceProfile.js'

/**
 * @param {Array<object>} script
 * @param {Array<object>} sceneUnits
 * @param {object} input
 */
export function buildNarrationOrchestrationPlan(script, sceneUnits, input) {
  const rows = Array.isArray(script) ? script : []
  const voiceProfile = buildVoiceProfile({
    storyLanguage: input?.storyLanguage,
    narratorId: input?.narratorId,
    genre: input?.genre,
    storyTone: input?.storyTone,
    styleId: input?.styleId,
    customVisualPrompt: input?.customVisualPrompt,
    narratorGenderPreference: input?.narratorGenderPreference
  })
  const profileSummary = summarizeVoiceProfileForBlueprint(voiceProfile)

  return sceneUnits.map((unit, i) => {
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const dir = buildVoiceDirection({
      storyLanguage: input?.storyLanguage,
      genre: input?.genre,
      storyTone: input?.storyTone,
      styleId: input?.styleId,
      customVisualPrompt: input?.customVisualPrompt,
      narratorId: input?.narratorId,
      narratorGenderPreference: input?.narratorGenderPreference,
      narration,
      visualDescription: row.visual_description
    })

    const emphasis =
      unit.beatType === 'reveal' || unit.beatType === 'climax'
        ? 'high'
        : unit.beatType === 'emotional'
          ? 'medium'
          : 'low'

    return {
      sceneIndex: unit.sceneIndex,
      pacingBias: dir.speedMul ?? 1,
      pauseBiasMs: dir.pauseBiasMs ?? 0,
      emphasis,
      deliveryNotes: [profileSummary?.slice(0, 120) || '', dir.instructionSuffix?.slice(0, 200) || '']
        .filter(Boolean)
        .join(' · ')
        .slice(0, 400)
    }
  })
}
