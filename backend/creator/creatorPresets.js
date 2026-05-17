/**
 * Creator preset storage helpers (server-side merge for API).
 */

const DEFAULT_PRESETS = [
  {
    id: 'preset_cinematic_default',
    name: 'Cinematic balanced',
    pacingBias: 'moderate',
    cameraStyle: 'dramatic',
    emotionalIntensity: 0.55,
    subtitleStyle: 'calm',
    transitionStyle: 'fade'
  },
  {
    id: 'preset_anime_expressive',
    name: 'Anime expressive',
    pacingBias: 'fast',
    cameraStyle: 'dramatic',
    emotionalIntensity: 0.75,
    subtitleStyle: 'dramatic',
    transitionStyle: 'anime_impact'
  }
]

/**
 * @param {Array<object>} [existing]
 */
export function mergeCreatorPresets(existing) {
  const map = new Map(DEFAULT_PRESETS.map((p) => [p.id, p]))
  for (const p of existing || []) {
    if (p?.id) map.set(p.id, { ...map.get(p.id), ...p })
  }
  return [...map.values()]
}
