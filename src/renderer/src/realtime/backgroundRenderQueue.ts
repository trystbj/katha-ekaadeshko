import { webRenderAdapter } from '../../../../web/adapters/webRenderAdapter'
import type { RenderRequest } from '../../../../core/render/types'
import type { BackgroundRenderJob } from '../../../../core/realtime/productionTypes'

type StatusRow = {
  id: string
  status: string
  progress?: number
  stage?: string
  video_url?: string
  error?: string
  updated_at?: string
}

export async function queueBackgroundRender(
  projectId: string,
  episodeNumber: number,
  payload: RenderRequest
): Promise<BackgroundRenderJob> {
  const { jobId } = await webRenderAdapter().queueRender(payload)
  const now = new Date().toISOString()
  return {
    id: jobId,
    projectId,
    episodeNumber,
    status: 'queued',
    progress: 0,
    stage: 'queued',
    queuedAt: now,
    updatedAt: now
  }
}

export async function pollBackgroundRenderJob(jobId: string): Promise<BackgroundRenderJob | null> {
  const res = await fetch(`/api/render-status?id=${encodeURIComponent(jobId)}`)
  if (!res.ok) return null
  const row = (await res.json()) as StatusRow
  const status =
    row.status === 'complete' || row.status === 'completed'
      ? 'complete'
      : row.status === 'failed'
        ? 'failed'
        : row.status === 'processing' || row.status === 'in_progress'
          ? 'processing'
          : 'queued'

  return {
    id: row.id,
    projectId: '',
    episodeNumber: 0,
    status,
    progress: typeof row.progress === 'number' ? row.progress : 0,
    stage: row.stage ?? status,
    videoUrl: row.video_url,
    error: row.error,
    queuedAt: row.updated_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString()
  }
}
