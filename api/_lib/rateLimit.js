/**
 * In-memory rate limit (per serverless instance).
 * For strict global limits, add Vercel KV / Upstash in a later phase.
 */

const buckets = new Map()

export function checkRateLimit(key, { windowMs = 60_000, max = 30 } = {}) {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.start + windowMs - now) / 1000) }
  }
  return { ok: true, remaining: max - bucket.count }
}

export function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}
