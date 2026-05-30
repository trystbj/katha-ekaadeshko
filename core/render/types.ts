export type RenderJobId = string

export type RenderAssemblyScene = {
  sceneIndex?: number
  startMs?: number
  endMs?: number
  durationMs?: number
  transitionIn?: string | null
}

export type RenderRequest = {
  storyTitle?: string
  images: string[]
  audio?: string
  backgroundMusic?: string
  storyAudioPlan?: unknown
  subtitles?: Array<{ startMs: number; endMs: number; text: string }>
  /** ASS burn-in with free X/Y (preferred over SRT when set). */
  subtitleAss?: string
  fps?: number
  secondsPerImage?: number
  /** Per-scene timing from cinematic director assembly plan. */
  renderAssemblyPlan?: {
    scenes?: RenderAssemblyScene[]
    secondsPerScene?: number
    totalDurationMs?: number
  }
  /** tiktok_cinematic | film_trailer | anime_cinematic | … */
  cinematicExportPreset?: string
  /** trailer | full — montage uses trailerRecap indices when set */
  renderMode?: 'full' | 'trailer'
  trailerSceneIndices?: number[]
}

export type RenderQueueResult = { jobId: RenderJobId }

export interface RenderAdapter {
  queueRender(req: RenderRequest): Promise<RenderQueueResult>
}

