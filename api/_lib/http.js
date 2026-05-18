import { parseRequestBody } from './parseBody.js'
import { checkRateLimit, clientIp } from './rateLimit.js'
import { publicErrorMessage, safeLog } from './log.js'

export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

export function json(res, status, body) {
  setSecurityHeaders(res)
  const payload = JSON.stringify(body ?? {})
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(body)
    return
  }
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(payload)
}

export function methodNotAllowed(res, methods = ['POST']) {
  res.setHeader('Allow', methods.join(', '))
  json(res, 405, { error: 'Method not allowed' })
}

/**
 * Standard JSON API handler factory.
 * @param {object} opts
 * @param {string[]} opts.methods
 * @param {import('zod').ZodTypeAny} [opts.schema]
 * @param {{ windowMs?: number, max?: number }} [opts.rateLimit]
 * @param {'body'|'query'} [opts.input] — default body; use query for GET handlers
 * @param {(req: import('@vercel/node').VercelRequest) => void} [opts.authorize]
 * @param {(ctx: { body: unknown, req: import('@vercel/node').VercelRequest }) => Promise<unknown>} opts.run
 */
export function createJsonHandler(opts) {
  const methods = opts.methods || ['POST']
  const input = opts.input || 'body'
  return async function handler(req, res) {
    setSecurityHeaders(res)
    if (!methods.includes(req.method || '')) {
      methodNotAllowed(res, methods)
      return
    }

    if (opts.rateLimit) {
      const ip = clientIp(req)
      const rl = checkRateLimit(`${req.url || 'api'}:${ip}`, opts.rateLimit)
      if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfterSec))
        json(res, 429, { error: 'Too many requests', retryAfterSec: rl.retryAfterSec })
        return
      }
    }

    try {
      if (opts.authorize) opts.authorize(req)
      const raw = input === 'query' ? req.query ?? {} : parseRequestBody(req)
      const body = opts.schema ? opts.schema.parse(raw) : raw
      const result = await opts.run({ body, req })
      json(res, 200, result ?? { ok: true })
    } catch (e) {
      const status =
        e?.name === 'ZodError' ? 400 : typeof e?.status === 'number' ? e.status : 500
      safeLog(status >= 500 ? 'error' : 'warn', 'API handler failed', {
        path: req.url,
        status,
        message: e instanceof Error ? e.message : String(e)
      })
      json(res, status, { error: publicErrorMessage(e) })
    }
  }
}

export function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    })
  ])
}
