/**
 * Emotion-aware cinematic transitions (enhances base transition director).
 */

import { buildSceneTransitions } from '../pipeline/transitionDirector.js'

const EMOTION_TRANSITION = {
  sadness: { style: 'slow_fade', durationMs: 520, blur: 0.15 },
  fear: { style: 'sharp_cut', durationMs: 140, blur: 0 },
  romance: { style: 'dreamy_dissolve', durationMs: 580, blur: 0.22 },
  suspense: { style: 'suspense_fade', durationMs: 480, blur: 0.1 },
  joy: { style: 'cinematic_flow', durationMs: 400, blur: 0.08 },
  anger: { style: 'impact_cut', durationMs: 160, blur: 0 }
}

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<object>} sceneUnits
 * @param {Array<object>} emotionProfiles
 * @param {object} directorPersonality
 */
export function buildSmartTransitions(enrichedScenes, sceneUnits, emotionProfiles, directorPersonality) {
  const base = buildSceneTransitions(enrichedScenes, sceneUnits, directorPersonality)
  return base.map((tr, i) => {
    const toEp = emotionProfiles[tr.toIndex] || emotionProfiles[i + 1]
    const primary = toEp?.primary || 'neutral'
    const emo =
      (toEp?.romance ?? 0) > 0.55
        ? EMOTION_TRANSITION.romance
        : EMOTION_TRANSITION[primary] || { style: tr.style, durationMs: tr.durationMs, blur: 0 }
    return {
      ...tr,
      ...emo,
      emotional: true,
      crossfadeAudio: emo.style !== 'sharp_cut' && emo.style !== 'impact_cut'
    }
  })
}
