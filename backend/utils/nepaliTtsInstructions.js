/**
 * Shared Nepali TTS delivery lock — preview + full narration pipeline.
 * Delegates to global language delivery profiles.
 */

import { getLanguageDeliveryBlock } from '../voice/languageDeliveryProfiles.js'

/**
 * @param {{ extendedPreview?: boolean }} [opts]
 * @returns {string}
 */
export function nepaliTtsDeliveryBlock(opts = {}) {
  return getLanguageDeliveryBlock('ne', opts)
}
