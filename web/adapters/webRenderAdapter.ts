import type { RenderAdapter, RenderQueueResult, RenderRequest } from '../../core/render/types'

/**
 * Web render adapter: queues renders via Vercel API (Supabase render_jobs).
 * Desktop version can implement local queue + optional cloud fallback.
 */
export function webRenderAdapter(): RenderAdapter {
  return {
    queueRender: async (req: RenderRequest): Promise<RenderQueueResult> => {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text)
      const j = JSON.parse(text) as { jobId: string }
      return { jobId: j.jobId }
    }
  }
}

