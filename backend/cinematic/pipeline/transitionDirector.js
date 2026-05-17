/**
 * Cinematic transition selection between scenes.
 */

/**
 * @param {object} fromScene enriched scene plan
 * @param {object} toScene enriched scene plan
 * @param {object} fromUnit breakdown unit
 * @param {object} toUnit breakdown unit
 * @param {object} [directorPersonality]
 */
export function inferSceneTransition(fromScene, toScene, fromUnit, toUnit, directorPersonality) {
  const fromMem = fromScene?.memorySequence?.kind
  const toMem = toScene?.memorySequence?.kind

  if (toMem === 'flashback' || toMem === 'recollection') {
    return { style: 'flashback_drift', durationMs: 520, crossfadeAudio: true }
  }
  if (toMem === 'dream' || toMem === 'symbolic_vision') {
    return { style: 'dream_soft', durationMs: 480, crossfadeAudio: true }
  }
  if (toUnit.beatType === 'reveal' || toUnit.beatType === 'climax') {
    return { style: 'anime_impact', durationMs: 280, crossfadeAudio: false }
  }
  if (fromUnit.beatType === 'emotional' && toUnit.beatType === 'emotional') {
    return { style: 'emotional_hold', durationMs: 400, crossfadeAudio: true }
  }
  if (toUnit.beatType === 'suspense' || (toScene?.suspenseLevel ?? 0) > 0.75) {
    return { style: 'suspense_fade', durationMs: 450, crossfadeAudio: true }
  }
  if (fromUnit.beatType === 'action' || toUnit.beatType === 'action') {
    return { style: 'cut', durationMs: 120, crossfadeAudio: false }
  }
  if (toUnit.beatType === 'atmosphere' || toUnit.beatType === 'world_building') {
    return { style: 'environment_pan', durationMs: 600, crossfadeAudio: true }
  }
  if (directorPersonality?.transitionStyle === 'dreamlike') {
    return { style: 'cinematic_dissolve', durationMs: 500, crossfadeAudio: true }
  }
  if (directorPersonality?.transitionStyle === 'sharp') {
    return { style: 'cut', durationMs: 160, crossfadeAudio: false }
  }
  return { style: 'fade', durationMs: 350, crossfadeAudio: true }
}

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<object>} sceneUnits
 * @param {object} [directorPersonality]
 */
export function buildSceneTransitions(enrichedScenes, sceneUnits, directorPersonality) {
  const transitions = []
  const n = enrichedScenes.length
  for (let i = 1; i < n; i++) {
    const cue = inferSceneTransition(
      enrichedScenes[i - 1],
      enrichedScenes[i],
      sceneUnits[i - 1],
      sceneUnits[i],
      directorPersonality
    )
    transitions.push({
      fromIndex: i - 1,
      toIndex: i,
      ...cue
    })
  }
  return transitions
}
