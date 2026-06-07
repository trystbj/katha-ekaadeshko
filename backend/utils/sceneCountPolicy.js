/**
 * Minimum scene counts and length-based targets for the storytelling pipeline.
 * Never generate fewer than ABSOLUTE_MIN_SCENES (10).
 */

import { isServerlessRuntime } from './runtime.js'

export const ABSOLUTE_MIN_SCENES = 10

/**
 * @param {object} [input]
 * @returns {{ min: number, max: number, target: number, label: string }}
 */
export function sceneCountRangeForInput(input = {}) {
  const length = String(input.length || input.storyLength || '').toLowerCase()
  const series = Boolean(
    input.seriesMode || input.isSeries || input.episodeSeries || input.__seriesMode
  )
  if (series) return { min: 20, max: 40, target: 24, label: 'series' }
  if (length.includes('long')) return { min: 15, max: 25, target: 18, label: 'long' }
  if (length.includes('medium')) return { min: 12, max: 15, target: 13, label: 'medium' }
  return { min: 10, max: 14, target: 10, label: 'short' }
}

/** Max script rows after LLM generation (desktop vs serverless). */
export function serverlessMaxScriptScenes(input = {}) {
  const range = sceneCountRangeForInput(input)
  if (!isServerlessRuntime()) return range.max
  const long = input?.__longStoryIntelligence?.active
  if (long) return Math.min(range.max, 14)
  if (input.scriptOnly === true || input.performancePreferLow) {
    return Math.max(ABSOLUTE_MIN_SCENES, Math.min(range.min, 12))
  }
  return Math.max(ABSOLUTE_MIN_SCENES, Math.min(range.target, 14))
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
  const min = Math.max(ABSOLUTE_MIN_SCENES, range.min)
  let rows = Array.isArray(script) ? script.map((r, i) => ({ ...r, scene: Number(r.scene) || i + 1 })) : []
  if (rows.length >= min) return rows.slice(0, range.max)
  if (typeof buildFallback === 'function') {
    const fb = buildFallback(story, Math.max(min, range.target))
    if (fb.length >= min) {
      console.info('[katha:pipeline]', 'script_padded_to_minimum', {
        from: rows.length,
        to: fb.length,
        min,
        label: range.label
      })
      return fb.slice(0, range.max)
    }
  }
  console.warn('[katha:pipeline]', 'script_below_minimum', { count: rows.length, min })
  return rows
}

/** Human-readable scene count instruction for script prompts. */
export function scriptSceneCountInstruction(input = {}) {
  const range = sceneCountRangeForInput(input)
  const cap = serverlessMaxScriptScenes(input)
  const min = Math.max(ABSOLUTE_MIN_SCENES, range.min)
  if (isServerlessRuntime()) {
    return `Produce exactly ${cap} scenes (minimum ${min} — never fewer than ${ABSOLUTE_MIN_SCENES}; server-optimized batch).`
  }
  return `Produce between ${min} and ${range.max} scenes (${range.label} story — target ${range.target}; NEVER fewer than ${ABSOLUTE_MIN_SCENES}).`
}
