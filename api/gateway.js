/**
 * Single Vercel serverless entry (Hobby plan: max 12 functions without a framework).
 * Legacy URLs are rewritten to /api/gateway?target=<route-name>.
 * Routes are loaded on demand so narrator-preview cold start stays light.
 */

const ROUTE_NAMES = new Set([
  'health',
  'jobs-stream-generate',
  'leonardo-generate',
  'narrator-preview',
  'creator-copilot',
  'creator-quality',
  'creator-scene-regenerate',
  'realtime-feedback',
  'social-caption',
  'social-shorts-optimize',
  'ui-i18n-bundle',
  'render',
  'render-status',
  'projects-list',
  'projects-get',
  'projects-save',
  'projects-delete',
  'worker-claim',
  'worker-pending',
  'worker-progress',
  'worker-complete'
])

/** Hobby-safe; narrator TTS must finish within this window. */
export const config = {
  maxDuration: 10
}

export default async function handler(req, res) {
  const target = String(req.query?.target || '').trim()
  if (!ROUTE_NAMES.has(target)) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unknown API route', target: target || null }))
    return
  }
  const mod = await import(`./_routes/${target}.js`)
  return mod.default(req, res)
}
