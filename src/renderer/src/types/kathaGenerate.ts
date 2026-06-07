/** Shape of `evt.result` from `/api/jobs-stream-generate` (pipeline JSON). */
export interface JobsStreamGenerateResult {
  story: {
    title: string
    setting: string
    /** Full generated prose (English canonical). */
    story?: string
    characters: Array<{ name: string; role: string; traits: string }>
  }
  script: Array<{
    narration: string
    scene?: number
    visual_description?: string
    composed_narration?: string
    dialogue?: Array<{ character?: string; line?: string }>
  }>
  images?: Array<{
    image_url?: string
    imageUrl?: string
    scene?: string | number
    prompt?: string
  }>
  audio?: Array<{
    scene?: string | number
    audio_url?: string
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
    longStoryIntelligence?: {
      active?: boolean
      seedChars?: number
      targetSceneCount?: number
      sceneCount?: number
      dramaticBeats?: string[]
      pacingProfile?: string
    }
    serverlessFastPath?: boolean
    pipelineCheckpoint?: string
    pipelineResumable?: boolean
    pipelineYielded?: boolean
    masterStoryContext?: Record<string, unknown>
    outputLanguage?: string
    regionalContext?: string
    productionStage?: string
    scriptOnlyComplete?: boolean
    productionDirectives?: Record<string, unknown>
    sceneProductionStates?: unknown[]
    productionMemory?: Record<string, unknown>
    visualBatch?: { batchSize?: number; remainingSceneIndices?: number[] }
    cinematicDirectorDegraded?: boolean
    renderAssemblyPlan?: Record<string, unknown>
    sceneOrchestration?: Record<string, unknown>
    qualityReport?: Record<string, unknown>
    cinematicBookends?: Record<string, unknown>
  }
}
