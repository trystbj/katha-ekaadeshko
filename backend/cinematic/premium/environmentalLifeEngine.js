/**
 * Environmental life — animated atmosphere layers reacting to emotion/weather.
 */

import { inferEnvironmentReaction } from '../environmentReaction.js'
import { analyzeSceneContext } from '../sceneContext.js'

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<{ narration?: string; visual_description?: string }>} script
 * @param {object} input
 */
export function applyEnvironmentalLifeToScenes(enrichedScenes, script, input) {
  return enrichedScenes.map((sc, i) => {
    const row = script[i] || {}
    const ctx = analyzeSceneContext({
      narration: row.narration,
      visualDescription: row.visual_description,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const env = inferEnvironmentReaction(ctx, input?.styleId, input?.storyTone)
    const tension = sc.tension ?? ctx.tension ?? 0.35

    const life = {
      rainMotion: env.rain > 0.3 ? 'steady' : env.rain > 0.1 ? 'drizzle' : 'off',
      windMotion: env.wind > 0.4 ? 'gust' : env.wind > 0.15 ? 'breeze' : 'off',
      fogDrift: env.fog > 0.35 ? 'slow_roll' : 'off',
      snowFall: /\b(snow|blizzard|हिउँ)\b/i.test(`${row.narration} ${row.visual_description}`) ? 'light' : 'off',
      leafSway: env.particles > 0.2 ? 'gentle' : 'off',
      lightFlicker: ctx.emotion === 'fear' || ctx.emotion === 'suspense' ? 'candle' : 'off',
      particleDensity: Math.min(1, env.particles + tension * 0.2),
      ambientIntensity: Math.min(1, 0.35 + tension * 0.4)
    }

    return {
      ...sc,
      environment: { ...(sc.environment || {}), ...env, life }
    }
  })
}
