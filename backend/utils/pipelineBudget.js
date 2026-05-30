/**
 * Cooperative pipeline time budget — checkpoint before hard serverless limits.
 */

import { isServerlessRuntime } from './runtime.js'

export const PIPELINE_SOFT_TIMEOUT_MS = isServerlessRuntime() ? 45_000 : 120_000
export const PIPELINE_HARD_TIMEOUT_MS = isServerlessRuntime() ? 58_000 : 300_000

/**
 * @typedef {object} PipelineBudgetHandle
 * @property {() => number} elapsedMs
 * @property {() => boolean} shouldYieldOptional
 * @property {() => boolean} shouldStop
 * @property {(stage: string, data?: object) => void} checkpoint
 * @property {() => object} getCheckpoint
 */

/**
 * @param {{ softMs?: number, hardMs?: number }} [opts]
 * @returns {PipelineBudgetHandle}
 */
export function createPipelineBudget(opts = {}) {
  const softMs = Number.isFinite(opts.softMs) ? opts.softMs : PIPELINE_SOFT_TIMEOUT_MS
  const hardMs = Number.isFinite(opts.hardMs) ? opts.hardMs : PIPELINE_HARD_TIMEOUT_MS
  const started = Date.now()
  /** @type {Record<string, unknown>} */
  let snapshot = { stage: 'init', startedAt: new Date().toISOString() }

  return {
    elapsedMs: () => Date.now() - started,
    shouldYieldOptional: () => Date.now() - started >= softMs,
    shouldStop: () => Date.now() - started >= hardMs,
    checkpoint(stage, data = {}) {
      snapshot = { ...snapshot, stage: String(stage), ...data, at: new Date().toISOString() }
    },
    getCheckpoint: () => ({ ...snapshot })
  }
}

export class PipelineYieldError extends Error {
  /**
   * @param {object} partialResult full or partial pipeline return shape
   * @param {string} [checkpoint]
   */
  constructor(partialResult, checkpoint = 'partial') {
    super(`pipeline_yield:${checkpoint}`)
    this.name = 'PipelineYieldError'
    this.partialResult = partialResult
    this.checkpoint = checkpoint
    this.status = 206
  }
}
