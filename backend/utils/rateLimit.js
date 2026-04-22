// Minimal in-memory rate limiter (replace with Redis in multi-instance production).

const buckets = new Map()

export function rateLimitMiddleware(req, res, next) {
  const windowMs = 60_000
  const max = Number(process.env.RATE_LIMIT_PER_MIN || 30)
  const key = ipKey(req)
  const now = Date.now()

  const b = buckets.get(key) || { resetAt: now + windowMs, count: 0 }
  if (now > b.resetAt) {
    b.resetAt = now + windowMs
    b.count = 0
  }
  b.count++
  buckets.set(key, b)

  res.setHeader('x-ratelimit-limit', String(max))
  res.setHeader('x-ratelimit-remaining', String(Math.max(0, max - b.count)))
  res.setHeader('x-ratelimit-reset', String(b.resetAt))

  if (b.count > max) {
    return res.status(429).json({ error: 'Rate limited' })
  }
  next()
}

function ipKey(req) {
  const xf = req.headers['x-forwarded-for']
  if (xf) return String(xf).split(',')[0].trim()
  return req.ip || 'unknown'
}

