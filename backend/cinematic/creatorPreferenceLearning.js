/**
 * Creator preference learning — adapts from studio choices over time.
 */

/**
 * @param {object} [input] pipeline input
 * @param {object} [priorPrefs]
 * @param {object} [directorPersonality]
 */
export function learnCreatorPreferences(input, priorPrefs, directorPersonality) {
  const prior = priorPrefs && typeof priorPrefs === 'object' ? priorPrefs : null
  const tone = String(input?.storyTone || prior?.emotionalTone || 'neutral').trim() || 'neutral'
  const genre = String(input?.genre || '').toLowerCase()

  let pacingBias = prior?.pacingBias || 'moderate'
  if (tone === 'tense' || tone === 'epic') pacingBias = 'fast'
  if (tone === 'tender' || tone === 'warm') pacingBias = 'slow'

  let cinematicIntensity = prior?.cinematicIntensity ?? 0.55
  if (input?.styleId === 'cinematic_anime' || input?.styleId === 'dark_anime') {
    cinematicIntensity = Math.min(1, cinematicIntensity + 0.05)
  }
  if (input?.performancePreferLow) cinematicIntensity = Math.max(0.35, cinematicIntensity - 0.1)

  return {
    version: 1,
    pacingBias,
    emotionalTone: tone,
    cinematicIntensity: Math.round(cinematicIntensity * 100) / 100,
    cameraStyle: directorPersonality?.compositionBias || prior?.cameraStyle || 'dramatic',
    soundtrackTaste: /horror|mystery/.test(genre) ? 'suspense_atmospheric' : prior?.soundtrackTaste || 'cinematic_emotional',
    updatedAt: new Date().toISOString()
  }
}

export function applyCreatorPreferencesToPlan(scenes, prefs) {
  if (!prefs || !Array.isArray(scenes)) return scenes
  const mul = prefs.cinematicIntensity ?? 0.55
  for (const sc of scenes) {
    if (sc.music) sc.music.intensity = Math.min(1, (sc.music.intensity ?? 0.5) * (0.85 + mul * 0.3))
    if (prefs.pacingBias === 'slow' && sc.pacing) {
      sc.pacing.pauseAfterMs = Math.round((sc.pacing.pauseAfterMs ?? 0) * 1.15)
    }
    if (prefs.pacingBias === 'fast' && sc.pacing) {
      sc.pacing.pauseAfterMs = Math.round((sc.pacing.pauseAfterMs ?? 0) * 0.85)
    }
  }
  return scenes
}

export function creatorPreferencesBlueprintBlock(prefs) {
  if (!prefs) return ''
  return [
    'CREATOR PREFERENCES (learned — bias future tone):',
    `- Pacing: ${prefs.pacingBias}`,
    `- Emotional tone: ${prefs.emotionalTone}`,
    `- Cinematic intensity: ${Math.round((prefs.cinematicIntensity ?? 0.5) * 100)}%`,
    `- Camera style: ${prefs.cameraStyle}`,
    `- Soundtrack taste: ${prefs.soundtrackTaste}`
  ].join('\n')
}
