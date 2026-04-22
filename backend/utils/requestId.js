import { randomUUID } from 'crypto'

export function requestIdMiddleware(req, res, next) {
  const rid = req.headers['x-request-id'] ? String(req.headers['x-request-id']) : randomUUID()
  req.requestId = rid
  res.setHeader('x-request-id', rid)
  next()
}

