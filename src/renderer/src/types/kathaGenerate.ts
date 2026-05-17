/** Shape of `evt.result` from `/api/jobs-stream-generate` (pipeline JSON). */
export interface JobsStreamGenerateResult {
  story: {
    title: string
    setting: string
    characters: Array<{ name: string; role: string; traits: string }>
  }
  script: Array<{ narration: string; scene?: number; visual_description?: string }>
  images?: Array<{
    image_url?: string
    imageUrl?: string
    scene?: string | number
    prompt?: string
  }>
  metadata?: {
    country?: string
    region?: string
    genre?: string
    theme?: string
    length?: string
    aiProviders?: Record<string, string>
    /** Mixkit (or other) preview MP3 — send as `backgroundMusic` when queueing `/api/render`. */
    ambientBedUrl?: string
    /** Worker mixes segmented beds + scene SFX + narrator ducking (same-origin URLs only). */
    storyAudioPlan?: Record<string, unknown>
    cinematicDirectorPlan?: Record<string, unknown>
    storyMemorySnapshot?: Record<string, unknown>
    memorySummaryPatch?: string
    worldStateSnapshot?: Record<string, unknown>
    relationshipSnapshot?: Record<string, unknown>[]
    creatorPreferencesPatch?: Record<string, unknown>
    sceneOrchestration?: Record<string, unknown>
    renderAssemblyPlan?: Record<string, unknown>
    visualStyleProfileKey?: string
    visualStyleHybrid?: boolean
    /** Locked prose/script language sent from studio (e.g. `ne`, `en`). */
    storyLanguage?: string
    /** Compact blueprint summary for debugging / downstream tooling. */
    generationBlueprint?: Record<string, unknown>
  }
}
