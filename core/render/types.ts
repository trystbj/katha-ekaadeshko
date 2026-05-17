export type RenderJobId = string

export type RenderRequest = {
  storyTitle?: string
  images: string[]
  audio?: string
  backgroundMusic?: string
  storyAudioPlan?: unknown
  subtitles?: Array<{ startMs: number; endMs: number; text: string }>
  fps?: number
  secondsPerImage?: number
}

export type RenderQueueResult = { jobId: RenderJobId }

export interface RenderAdapter {
  queueRender(req: RenderRequest): Promise<RenderQueueResult>
}

