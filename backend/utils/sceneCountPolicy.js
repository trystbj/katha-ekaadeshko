/**
 * Minimum scene counts, length-based targets, and dialogue density for the storytelling pipeline.
 * Never generate fewer than ABSOLUTE_MIN_SCENES (10).
 *
 * Length tiers (cinematic dialogue-driven targets):
 *   short  : 10-12 scenes  ·  5-10 dialogue/narration entries per scene
 *   medium : 12-20 scenes  ·  8-15 entries per scene
 *   long   : 20-40 scenes  ·  10-20 entries per scene
 *   epic   : 40-60 scenes  ·  10-25 entries per scene
 */

import { isServerlessRuntime } from './runtime.js'

export const ABSOLUTE_MIN_SCENES = 10

/** Hard ceiling per single LLM script request on serverless (timeout / token guard). */
const SERVERLESS_SCRIPT_CEILING = 13

/**
 * @param {object} [input]
 * @returns {{ min: number, max: number, target: number, label: string }}
 */
export function sceneCountRangeForInput(input = {}) {
  const length = String(input.length || input.storyLength || '').toLowerCase()
  const series = Boolean(
    input.seriesMode || input.isSeries || input.episodeSeries || input.__seriesMode
  )
  const epic =
    Boolean(input.epicMode || input.__epicMode) || length.includes('epic')
  if (epic) return { min: 40, max: 60, target: 44, label: 'epic' }
  if (series) return { min: 20, max: 40, target: 26, label: 'series' }
  if (length.includes('long')) return { min: 20, max: 40, target: 26, label: 'long' }
  if (length.includes('medium')) return { min: 12, max: 20, target: 15, label: 'medium' }
  return { min: 10, max: 12, target: 11, label: 'short' }
}

/**
 * Dialogue + narration entries each scene should contain (cinematic, dialogue-driven).
 * `min` is the floor; never produce 1–3 line summary scenes.
 * @param {object} [input]
 * @returns {{ min: number, preferred: number, max: number }}
 */
export function dialogueDensityForInput(input = {}) {
  const { label } = sceneCountRangeForInput(input)
  const full = (() => {
    switch (label) {
      case 'epic':
        return { min: 10, preferred: 18, max: 25 }
      case 'series':
      case 'long':
        return { min: 10, preferred: 15, max: 20 }
      case 'medium':
        return { min: 8, preferred: 12, max: 15 }
      default:
        return { min: 5, preferred: 8, max: 10 }
    }
  })()
  // Serverless: bound per-scene output so the single LLM script call finishes
  // within the Vercel function time budget (rich but not runaway).
  if (isServerlessRuntime()) {
    return {
      min: Math.min(full.min, 5),
      preferred: Math.min(full.preferred, 8),
      max: Math.min(full.max, 10)
    }
  }
  return full
}

/** Max script rows after LLM generation (desktop vs serverless). */
export function serverlessMaxScriptScenes(input = {}) {
  const range = sceneCountRangeForInput(input)
  if (!isServerlessRuntime()) return range.max
  if (input.scriptOnly === true || input.performancePreferLow) {
    return Math.max(ABSOLUTE_MIN_SCENES, Math.min(range.target, 14))
  }
  const long = input?.__longStoryIntelligence?.active
  if (long) return Math.min(range.max, SERVERLESS_SCRIPT_CEILING)
  return Math.max(ABSOLUTE_MIN_SCENES, Math.min(range.target, SERVERLESS_SCRIPT_CEILING))
}

/** Effective minimum scenes that never exceeds the runtime ceiling (prevents pad/trim conflict). */
export function effectiveMinScenes(input = {}) {
  const range = sceneCountRangeForInput(input)
  const desiredMin = Math.max(ABSOLUTE_MIN_SCENES, range.min)
  const ceiling = serverlessMaxScriptScenes(input)
  return Math.max(ABSOLUTE_MIN_SCENES, Math.min(desiredMin, ceiling))
}

/**
 * Ensure script meets minimum scene count — pad from fallback story split when LLM under-delivers.
 * @param {Array<Record<string, unknown>>} script
 * @param {object} story
 * @param {object} [input]
 * @param {typeof import('../../shared/fallbackScriptFromStory.js').buildFallbackScriptFromStory} buildFallback
 */
export function enforceMinimumScriptScenes(script, story, input = {}, buildFallback) {
  const range = sceneCountRangeForInput(input)
  const min = effectiveMinScenes(input)
  const ceiling = serverlessMaxScriptScenes(input)
  const cap = Math.max(min, Math.min(range.max, ceiling))
  let rows = Array.isArray(script) ? script.map((r, i) => ({ ...r, scene: Number(r.scene) || i + 1 })) : []
  if (rows.length >= min) return rows.slice(0, cap)
  if (typeof buildFallback === 'function') {
    const fb = buildFallback(story, Math.max(min, Math.min(range.target, ceiling)))
    if (fb.length >= min) {
      console.info('[katha:pipeline]', 'script_padded_to_minimum', {
        from: rows.length,
        to: fb.length,
        min,
        label: range.label
      })
      return fb.slice(0, cap)
    }
  }
  console.warn('[katha:pipeline]', 'script_below_minimum', { count: rows.length, min })
  return rows
}

/** Human-readable scene count instruction for script prompts. */
export function scriptSceneCountInstruction(input = {}) {
  const range = sceneCountRangeForInput(input)
  const cap = serverlessMaxScriptScenes(input)
  const min = effectiveMinScenes(input)
  const density = dialogueDensityForInput(input)
  const densityHint = `each scene packed with ${density.min}-${density.max} dialogue/narration entries (target ~${density.preferred})`
  if (isServerlessRuntime()) {
    return `Produce exactly ${cap} richly-developed scenes (minimum ${min} — never fewer than ${ABSOLUTE_MIN_SCENES}; server-optimized batch), ${densityHint}.`
  }
  return `Produce between ${min} and ${range.max} richly-developed scenes (${range.label} story — target ${range.target}; NEVER fewer than ${ABSOLUTE_MIN_SCENES}), ${densityHint}.`
}
