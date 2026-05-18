/** Story seed / idea field — single source of truth for web + API. */

export const STORY_IDEA_MIN_CHARS = 2
export const STORY_IDEA_MAX_CHARS = 10_000
/** UI soft warning — allowed, but generation may be slower past this. */
export const STORY_IDEA_SOFT_WARN_CHARS = 6_000
/** Max seed text embedded in LLM prompts (full seed still accepted up to MAX). */
export const SEED_LINE_PIPELINE_MAX_CHARS = 6_000

export function clampStoryIdea(text) {
  return String(text ?? '').slice(0, STORY_IDEA_MAX_CHARS)
}

/**
 * Preserve head + tail of very long seeds for blueprint/LLM budget without dropping user intent.
 * @param {string} seedLine
 * @param {number} [max]
 */
export function compactSeedLineForPipeline(seedLine, max = SEED_LINE_PIPELINE_MAX_CHARS) {
  const t = String(seedLine || '').trim()
  if (t.length <= max) return t
  const marker =
    '\n\n[… middle of long story seed omitted for generation budget — beginning and ending preserved …]\n\n'
  const budget = Math.max(512, max - marker.length)
  const headLen = Math.floor(budget * 0.58)
  const tailLen = budget - headLen
  return `${t.slice(0, headLen)}${marker}${t.slice(-tailLen)}`
}

export function isStoryIdeaSoftWarn(length) {
  return Number(length) > STORY_IDEA_SOFT_WARN_CHARS
}
