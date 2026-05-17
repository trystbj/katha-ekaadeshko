/** Production-safe logging — never log secrets or full request bodies. */

const REDACT_KEYS = /key|token|secret|password|authorization/i

export function safeLog(level, message, meta) {
  if (process.env.NODE_ENV === 'test') return
  const payload = meta ? sanitizeMeta(meta) : undefined
  const line = payload ? `${message} ${JSON.stringify(payload)}` : message
  if (level === 'error') console.error('[katha-api]', line)
  else if (level === 'warn') console.warn('[katha-api]', line)
  else if (process.env.KATHA_API_VERBOSE === '1') console.info('[katha-api]', line)
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta
  const out = {}
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.test(k)) {
      out[k] = '[redacted]'
    } else if (typeof v === 'string' && v.length > 200) {
      out[k] = `${v.slice(0, 200)}…`
    } else {
      out[k] = v
    }
  }
  return out
}

export function publicErrorMessage(err) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  if (!isProd) return err instanceof Error ? err.message : String(err)
  if (err?.name === 'ZodError') return 'Invalid request'
  return 'Request failed'
}
