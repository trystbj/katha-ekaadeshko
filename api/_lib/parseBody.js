/** Parse JSON body from Vercel request (string or object). */

export function parseRequestBody(req) {
  if (req.body == null) return {}
  if (typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    const t = req.body.trim()
    if (!t) return {}
    return JSON.parse(t)
  }
  return {}
}
