/**
 * Advanced cinematic audio — ambience layers, reverb, dialogue ducking, transitions.
 */

/**
 * @param {object} storyAudioPlan
 * @param {Array<object>} enrichedScenes
 */
export function enrichAdvancedAudioPlan(storyAudioPlan, enrichedScenes) {
  if (!storyAudioPlan || !Array.isArray(storyAudioPlan.segments)) return storyAudioPlan

  const segments = storyAudioPlan.segments.map((seg, i) => {
    const sc = enrichedScenes[i] || {}
    const prev = i > 0 ? enrichedScenes[i - 1] : null
    const mood = sc.audioMix?.musicMood || sc.aiDirector?.musicMood || 'ambient'
    const silence = sc.audioMix?.silencePadMs ?? 0
    return {
      ...seg,
      ambienceLayer: sc.environment?.life?.rainMotion !== 'off' ? 'weather' : 'room_tone',
      reverbSend: mood === 'dramatic' ? 0.28 : mood === 'romance' ? 0.18 : 0.12,
      dialoguePriority: Array.isArray(sc.dialogueStaging?.shots) ? 1.08 : 1,
      soundtrackCrossfadeMs: prev && segmentsDiffer(mood, prev) ? 900 : 400,
      silencePadMs: silence,
      environmentalGain: Math.min(0.12, (sc.environment?.life?.ambientIntensity ?? 0.35) * 0.08)
    }
  })

  return {
    ...storyAudioPlan,
    version: 2,
    advancedMix: true,
    masterReverb: 0.14,
    narratorDuckOnBed: 0.88,
    segments
  }
}

function segmentsDiffer(mood, prevSc) {
  const pm = prevSc?.audioMix?.musicMood || prevSc?.aiDirector?.musicMood
  return pm && mood !== pm
}
