/**
 * Deterministic spoken-duration estimation for dialogue lines and narration.
 *
 * Durations drive narration timing, subtitle timing, and animation timing downstream.
 * The LLM is asked to provide a "duration" per line, but we never trust it blindly —
 * this module fills missing values and clamps implausible ones so every line always
 * has a realistic, renderable duration.
 */

const MIN_LINE_SEC = 1.2
const MAX_LINE_SEC = 18
const MIN_NARRATION_SEC = 1.5
const MAX_NARRATION_SEC = 30

/** Logographic scripts (CJK) — estimate by character, not word. */
const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/

/**
 * Estimate spoken duration in seconds for a piece of text.
 * ~2.7 words/sec for alphabetic speech, ~5.5 chars/sec for CJK, plus a small pause buffer.
 * @param {string} text
 * @param {{ minSec?: number, maxSec?: number, pauseSec?: number }} [opts]
 * @returns {number} seconds rounded to 1 decimal
 */
export function estimateSpokenDurationSec(text, opts = {}) {
  const raw = String(text || '').trim()
  if (!raw) return 0
  const minSec = typeof opts.minSec === 'number' ? opts.minSec : MIN_LINE_SEC
  const maxSec = typeof opts.maxSec === 'number' ? opts.maxSec : MAX_LINE_SEC
  const pauseSec = typeof opts.pauseSec === 'number' ? opts.pauseSec : 0.35

  let seconds
  if (CJK_RE.test(raw)) {
    const chars = raw.replace(/\s+/g, '').length
    seconds = chars / 5.5
  } else {
    const words = raw.split(/\s+/).filter(Boolean).length
    seconds = words / 2.7
  }
  // Punctuation adds dramatic pauses (commas, ellipses, dashes, sentence ends).
  const pauses = (raw.match(/[,;:…—-]|\.\.\.|[.!?]/g) || []).length
  seconds += pauses * 0.18 + pauseSec

  return clamp(round1(seconds), minSec, maxSec)
}

/**
 * Coerce an LLM-provided duration to a sane number, else estimate from text.
 * Accepts numbers or strings like "2.4s" / "(2.7s)".
 * @param {unknown} provided
 * @param {string} text
 * @param {{ minSec?: number, maxSec?: number }} [opts]
 */
function resolveDuration(provided, text, opts = {}) {
  const estimate = estimateSpokenDurationSec(text, opts)
  let n = NaN
  if (typeof provided === 'number') n = provided
  else if (typeof provided === 'string') {
    const m = provided.match(/-?\d+(\.\d+)?/)
    if (m) n = Number(m[0])
  }
  if (!Number.isFinite(n) || n <= 0) return estimate
  const minSec = typeof opts.minSec === 'number' ? opts.minSec : MIN_LINE_SEC
  const maxSec = typeof opts.maxSec === 'number' ? opts.maxSec : MAX_LINE_SEC
  // If the model's number is wildly off vs. the estimate, blend toward the estimate.
  const clamped = clamp(round1(n), minSec, maxSec)
  if (estimate > 0 && (clamped > estimate * 3 || clamped < estimate / 3)) {
    return round1((clamped + estimate) / 2)
  }
  return clamped
}

/**
 * Attach durations to every dialogue line + narration on each script row, and a
 * total `scene_duration` (seconds). Mutates a shallow copy; safe to call once after
 * the script is normalized. Backward compatible — only ADDS fields.
 *
 * @param {Array<Record<string, any>>} script
 * @returns {Array<Record<string, any>>}
 */
export function attachSceneDurations(script) {
  if (!Array.isArray(script)) return []
  return script.map((row) => {
    if (!row || typeof row !== 'object') return row
    const narration = String(row.narration || '').trim()
    const narrationDuration = narration
      ? resolveDuration(row.narration_duration, narration, {
          minSec: MIN_NARRATION_SEC,
          maxSec: MAX_NARRATION_SEC,
          pauseSec: 0.5
        })
      : 0

    const dialogue = Array.isArray(row.dialogue)
      ? row.dialogue.map((d) => {
          if (!d || typeof d !== 'object') return d
          const line = String(d.line || '').trim()
          if (!line) return d
          return { ...d, duration: resolveDuration(d.duration, line) }
        })
      : []

    const dialogueTotal = dialogue.reduce(
      (sum, d) => sum + (Number(d && d.duration) || 0),
      0
    )
    // Small inter-line breathing room between spoken lines.
    const interLinePause = dialogue.length > 1 ? (dialogue.length - 1) * 0.25 : 0
    const sceneDuration = round1(narrationDuration + dialogueTotal + interLinePause)

    return {
      ...row,
      ...(narration ? { narration_duration: narrationDuration } : {}),
      ...(dialogue.length ? { dialogue } : {}),
      scene_duration: clamp(sceneDuration, 2, 180)
    }
  })
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}
