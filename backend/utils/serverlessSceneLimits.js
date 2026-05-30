/**
 * Adaptive scene/script limits for serverless — avoid timeout without asking user to shorten story.
 */

import { isServerlessRuntime, serverlessFastPipeline } from './runtime.js'

export function serverlessMaxScriptScenes(input = {}) {
  if (!isServerlessRuntime()) return 12
  const long = input?.__longStoryIntelligence?.active
  if (long) return 8
  if (serverlessFastPipeline() || input.scriptOnly === true || input.performancePreferLow) return 6
  return 8
}

export function serverlessLeonardoParallelLimit() {
  if (!isServerlessRuntime()) {
    const n = Number(process.env.KATHA_LEONARDO_PARALLEL)
    return Number.isFinite(n) && n > 0 ? Math.min(n, 6) : 6
  }
  const n = Number(process.env.KATHA_LEONARDO_PARALLEL_SERVERLESS)
  if (Number.isFinite(n) && n > 0) return Math.min(n, 3)
  return 2
}

export function serverlessLeonardoSceneCooldownMs() {
  if (!isServerlessRuntime()) return 0
  const n = Number(process.env.KATHA_LEONARDO_SCENE_COOLDOWN_MS)
  return Number.isFinite(n) && n >= 0 ? n : 600
}

/** Max scenes per visual SSE request on serverless (continue via sceneIndices). */
export function serverlessMaxScenesPerVisualBatch(totalScenes) {
  if (!isServerlessRuntime()) return totalScenes
  const cap = Number(process.env.KATHA_VISUAL_BATCH_SCENES)
  const max = Number.isFinite(cap) && cap > 0 ? Math.min(cap, 6) : 3
  return Math.min(totalScenes, max)
}

/**
 * @param {Array<Record<string, unknown>>} script
 * @param {number} maxScenes
 */
export function capScriptScenes(script, maxScenes) {
  const rows = Array.isArray(script) ? script : []
  if (rows.length <= maxScenes) return rows
  const kept = rows.slice(0, maxScenes)
  console.info('[katha:pipeline]', 'script_scenes_capped', { from: rows.length, to: maxScenes })
  return kept
}
