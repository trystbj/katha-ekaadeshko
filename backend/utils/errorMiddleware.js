import { ZodError } from 'zod'

export function errorMiddleware(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid input',
      details: err.issues
    })
  }
  const msg = err instanceof Error ? err.message : String(err)
  const code = msg.includes('missing') ? 500 : 500
  return res.status(code).json({ error: msg })
}

