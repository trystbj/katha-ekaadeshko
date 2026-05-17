/**
 * Shared Nepali TTS delivery lock — preview + full narration pipeline.
 * Delegates to dedicated Nepali pronunciation engine.
 */

import { nepaliDeliveryInstructionBlock } from '../voice/nepaliPronunciationEngine.js'

/**
 * @param {{ extendedPreview?: boolean }} [opts]
 * @param {Record<string, unknown>} [ctx]
 * @returns {string}
 */
export function nepaliTtsDeliveryBlock(opts = {}, ctx = {}) {
  return nepaliDeliveryInstructionBlock(opts, ctx)
}
