/** Production-safe logging — never log secrets or full request bodies. */

const REDACT_KEYS = /key|token|secret|password|authorization|bearer/i

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

function mapKnownPipelineError(raw, err) {
  const msg = String(raw || '').trim()
  if (!msg) return null
  if (err?.status === 504 || /timed out|60s limit|server time limit/i.test(msg)) {
    return 'Generation paused — your progress was saved. Tap Generate again to continue.'
  }
  if (/API_KEY|missing API key|All providers failed|providers failed/i.test(msg)) {
    if (/openai.*missing|gemini.*missing|deepseek.*missing/i.test(msg.toLowerCase())) {
      return 'Story AI is not configured on the server. Add OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY in Vercel → Settings → Environment Variables, then redeploy.'
    }
    return 'Story AI could not run. Check API keys on the server and try again.'
  }
  if (/quota|insufficient/i.test(msg)) {
    return 'AI quota exceeded. Try again later or update your API billing.'
  }
  if (/Script generation returned no scenes/i.test(msg)) {
    return msg
  }
  if (/Repetition guard/i.test(msg)) {
    return msg
  }
  if (/Invalid request/i.test(msg) || msg.includes('Zod')) {
    return 'Invalid story settings. Check genre, style, narrator, and seed, then try again.'
  }
  if (/invalid JSON response/i.test(msg)) {
    return 'AI returned an invalid response. Please try Generate again.'
  }
  if (/HTTP 401|HTTP 403|incorrect api key|invalid_api_key|authentication/i.test(msg)) {
    return 'AI API key was rejected (401/403). Check the key value in Vercel env vars and redeploy.'
  }
  if (/HTTP 429|rate limit/i.test(msg)) {
    return 'AI rate limit hit. Wait a minute and try again.'
  }
  if (/HTTP 5\d{2}/.test(msg)) {
    return 'AI provider server error. Try again in a few minutes.'
  }
  if (/LEONARDO_API_KEY is missing/i.test(msg)) {
    return 'Leonardo is not configured. Add LEONARDO_API_KEY in server environment variables.'
  }
  if (/Leonardo motion: timeout/i.test(msg)) {
    return 'Leonardo video generation timed out. Try fast mode or fewer scenes, then retry.'
  }
  if (/Leonardo:/i.test(msg) || /Video generation failed/i.test(msg)) {
    return msg.length > 360 ? `${msg.slice(0, 357)}…` : msg
  }
  if (/missing_leonardo_image_id|Missing scene still ID/i.test(msg)) {
    return 'Scene images are missing Leonardo IDs. Regenerate scene stills, then try Final Video again.'
  }
  if (/AbortError|aborted|ECONNRESET|fetch failed/i.test(msg)) {
    return 'Connection interrupted — progress may be saved. Tap Generate again to continue.'
  }
  if (/Function.*timeout|ECONNRESET|fetch failed/i.test(msg)) {
    return 'Server connection interrupted — tap Generate again to resume from the last saved step.'
  }
  return null
}

/** Strip paths/secrets; keep enough detail for users to act. */
export function sanitizePublicError(raw) {
  let msg = String(raw || '')
    .replace(/\r/g, '')
    .trim()
  if (!msg || /^request failed$/i.test(msg)) return ''

  msg = msg.split('\n---\n')[0].trim()
  msg = msg.replace(/sk-[a-zA-Z0-9_-]{8,}/gi, '[api-key]')
  msg = msg.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [redacted]')
  msg = msg.replace(/[A-Za-z]:\\[^\s'"]+/g, '[path]')
  msg = msg.replace(/\/[\w./-]+\.(?:js|mjs|cjs|ts)(?::\d+)?(?::\d+)?/gi, '[module]')

  if (msg.length > 360) msg = `${msg.slice(0, 357)}…`
  return msg
}

function formatZodError(err) {
  const issues = err?.issues || err?.errors
  if (!Array.isArray(issues) || !issues.length) return 'Invalid request — check story settings and try again.'
  const first = issues[0]
  const path = Array.isArray(first?.path) ? first.path.join('.') : ''
  const detail = String(first?.message || 'validation failed')
  return path ? `Invalid request (${path}): ${detail}` : `Invalid request: ${detail}`
}

export function publicErrorMessage(err) {
  const mapped = mapKnownPipelineError(err instanceof Error ? err.message : String(err), err)
  if (mapped) return mapped

  if (err?.name === 'ZodError') return formatZodError(err)

  const raw = err instanceof Error ? err.message : String(err)
  const safe = sanitizePublicError(raw)
  if (safe) return safe

  return 'Story generation failed unexpectedly. Check Vercel env keys (OPENAI_API_KEY or GEMINI_API_KEY or DEEPSEEK_API_KEY), redeploy, then try again.'
}
