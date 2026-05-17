/**
 * Adaptive performance tier — renderer hints (no provider lock-in).
 */

/**
 * @param {object} [hints]
 * @param {boolean} [hints.preferLow]
 * @param {number} [hints.sceneCount]
 */
export function inferSmartPerformanceProfile(hints = {}) {
  const sceneCount = hints.sceneCount ?? 8
  let tier = 'balanced'

  if (hints.preferLow || sceneCount > 14) tier = 'low'
  if (hints.preferHigh && sceneCount <= 8) tier = 'high'

  const profiles = {
    low: {
      tier: 'low',
      motionQuality: 0.45,
      vfxDensity: 0.35,
      audioLayerCap: 4,
      particleCap: 12
    },
    balanced: {
      tier: 'balanced',
      motionQuality: 0.72,
      vfxDensity: 0.6,
      audioLayerCap: 6,
      particleCap: 28
    },
    high: {
      tier: 'high',
      motionQuality: 1,
      vfxDensity: 0.9,
      audioLayerCap: 8,
      particleCap: 48
    }
  }

  return profiles[tier] || profiles.balanced
}
