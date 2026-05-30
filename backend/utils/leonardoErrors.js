/**
 * Parse Leonardo REST error bodies into user-facing messages.
 */

export function parseLeonardoApiError(status, bodyText = '') {
  const raw = String(bodyText || '').trim()
  if (!raw) {
    if (status === 401 || status === 403) return 'Leonardo API key rejected — check LEONARDO_API_KEY in server env.'
    if (status === 429) return 'Leonardo rate limit — wait a moment and retry.'
    if (status >= 500) return `Leonardo server error (HTTP ${status}). Try again shortly.`
    return `Leonardo API error (HTTP ${status}).`
  }
  try {
    const json = JSON.parse(raw)
    const msg =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      json?.detail ||
      (Array.isArray(json?.errors) ? json.errors.map((e) => e?.message || e).join('; ') : null)
    if (typeof msg === 'string' && msg.trim()) return `Leonardo: ${msg.trim().slice(0, 280)}`
    if (msg && typeof msg === 'object' && typeof msg.message === 'string') {
      return `Leonardo: ${msg.message.slice(0, 280)}`
    }
  } catch {
    /* plain text */
  }
  return `Leonardo ${status}: ${raw.slice(0, 280)}`
}

export function humanizeVideoFailure(message) {
  const m = String(message || '').trim()
  if (m === 'missing_leonardo_image_id') {
    return 'Missing scene still ID — regenerate scene images before motion.'
  }
  if (/timeout/i.test(m)) return 'Leonardo motion timed out — retry or use fast mode.'
  if (/generation failed/i.test(m)) return 'Leonardo motion generation failed for this scene.'
  return m.slice(0, 240)
}

export function summarizeVideoFailures(failures = []) {
  if (!failures.length) return 'Video generation failed.'
  const lines = failures.slice(0, 6).map((f) => `Scene ${f.scene}: ${humanizeVideoFailure(f.message)}`)
  return `Video generation failed — ${lines.join(' · ')}`
}
