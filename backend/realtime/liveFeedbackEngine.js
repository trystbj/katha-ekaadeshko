/**
 * Live cinematic feedback — reuses quality analyzer + rhythm hints for editing.
 */
import { analyzeCinematicQuality } from '../creator/qualityAnalyzer.js'

/**
 * @param {object} episode
 */
export function analyzeLiveFeedback(episode) {
  const base = analyzeCinematicQuality(episode)
  const plan = episode?.cinematicDirectorPlan
  const scenes = plan?.scenes || []

  const suggestions = [...(base.suggestions || [])]
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]
    if (sc?.camera?.breathing > 0.78) {
      suggestions.push({
        id: `live-cam-${i}`,
        severity: 'tip',
        sceneIndex: i + 1,
        message: 'Camera motion too intense for current emotional beat.',
        fixTarget: 'camera'
      })
    }
    if (sc?.music?.intensity > 0.9 && sc?.emotion?.intensity < 0.35) {
      suggestions.push({
        id: `live-music-${i}`,
        severity: 'info',
        sceneIndex: i + 1,
        message: 'Soundtrack energy high vs low emotion — balance may help.',
        fixTarget: 'soundtrack'
      })
    }
  }

  return {
    ...base,
    version: 1,
    analyzedAt: new Date().toISOString(),
    suggestions: suggestions.slice(0, 14)
  }
}
