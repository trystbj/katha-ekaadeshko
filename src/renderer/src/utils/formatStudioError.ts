/**
 * Single-line studio errors — dedupe timeout stacks and hide dev-only suffixes.
 */

const TIMEOUT_USER_MESSAGE =
  'Generation paused — your progress was saved. Tap Generate again to continue.'

function isTimeoutMessage(text: string): boolean {
  return (
    /timed out|60s limit|server time limit|shorter story|generate again|pipeline_yield|function.*timeout|504|gateway timeout/i.test(
      text
    )
  )
}

/** Collapse duplicate clauses and map legacy timeout copy to one friendly line. */
export function normalizeStudioErrorMessage(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let t = String(raw).replace(/\r/g, ' ').trim()
  if (!t || t === '[object Object]') return null

  if (isTimeoutMessage(t)) return TIMEOUT_USER_MESSAGE

  const parts = t
    .split(/\s*—\s*/)
    .map((p) => p.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const unique: string[] = []
  for (const part of parts) {
    const key = part
      .replace(/\s*\(API build [a-f0-9]+\)/gi, '')
      .replace(/\s*\[[\w]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    if (!key || seen.has(key)) continue
    if (isTimeoutMessage(key)) {
      if (!seen.has(TIMEOUT_USER_MESSAGE.toLowerCase())) {
        seen.add(TIMEOUT_USER_MESSAGE.toLowerCase())
        unique.push(TIMEOUT_USER_MESSAGE)
      }
      continue
    }
    seen.add(key)
    unique.push(
      part
        .replace(/\s*\(API build [a-f0-9]+\)/gi, '')
        .replace(/\s*\[pipeline\]/gi, '')
        .trim()
    )
  }

  const out = (unique.length ? unique.join(' — ') : t)
    .replace(/\s*\(API build [a-f0-9]+\)/gi, '')
    .replace(/\s*\[pipeline\]/gi, '')
    .trim()

  if (!out) return null
  if (isTimeoutMessage(out)) return TIMEOUT_USER_MESSAGE
  return out
}
