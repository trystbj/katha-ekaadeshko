export function securityHeadersMiddleware(_req, res, next) {
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('x-frame-options', 'DENY')
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('permissions-policy', 'geolocation=(), microphone=(), camera=()')
  // For an API server, a strict CSP is fine (no HTML), but keep it minimal.
  res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
  next()
}

