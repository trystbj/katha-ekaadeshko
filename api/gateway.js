/**
 * Single Vercel serverless entry (Hobby plan: max 12 functions without a framework).
 * Legacy URLs are rewritten to /api/gateway?target=<route-name>.
 */
import health from './_routes/health.js'
import jobsStreamGenerate from './_routes/jobs-stream-generate.js'
import leonardoGenerate from './_routes/leonardo-generate.js'
import narratorPreview from './_routes/narrator-preview.js'
import creatorCopilot from './_routes/creator-copilot.js'
import creatorQuality from './_routes/creator-quality.js'
import creatorSceneRegenerate from './_routes/creator-scene-regenerate.js'
import realtimeFeedback from './_routes/realtime-feedback.js'
import socialCaption from './_routes/social-caption.js'
import socialShortsOptimize from './_routes/social-shorts-optimize.js'
import uiI18nBundle from './_routes/ui-i18n-bundle.js'
import renderEnqueue from './_routes/render.js'
import renderStatus from './_routes/render-status.js'
import projectsList from './_routes/projects-list.js'
import projectsGet from './_routes/projects-get.js'
import projectsSave from './_routes/projects-save.js'
import projectsDelete from './_routes/projects-delete.js'
import workerClaim from './_routes/worker-claim.js'
import workerPending from './_routes/worker-pending.js'
import workerProgress from './_routes/worker-progress.js'
import workerComplete from './_routes/worker-complete.js'

const ROUTES = {
  health,
  'jobs-stream-generate': jobsStreamGenerate,
  'leonardo-generate': leonardoGenerate,
  'narrator-preview': narratorPreview,
  'creator-copilot': creatorCopilot,
  'creator-quality': creatorQuality,
  'creator-scene-regenerate': creatorSceneRegenerate,
  'realtime-feedback': realtimeFeedback,
  'social-caption': socialCaption,
  'social-shorts-optimize': socialShortsOptimize,
  'ui-i18n-bundle': uiI18nBundle,
  render: renderEnqueue,
  'render-status': renderStatus,
  'projects-list': projectsList,
  'projects-get': projectsGet,
  'projects-save': projectsSave,
  'projects-delete': projectsDelete,
  'worker-claim': workerClaim,
  'worker-pending': workerPending,
  'worker-progress': workerProgress,
  'worker-complete': workerComplete
}

/** Allow longer OpenAI TTS preview (Pro: up to 300s; Hobby capped by plan). */
export const config = {
  maxDuration: 60
}

export default async function handler(req, res) {
  const target = String(req.query?.target || '').trim()
  const route = ROUTES[target]
  if (!route) {
    res.status(404).json({ error: 'Unknown API route', target: target || null })
    return
  }
  return route(req, res)
}
