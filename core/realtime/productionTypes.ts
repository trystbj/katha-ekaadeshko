/** Real-time cinematic production pipeline — shared types (renderer + worker ready). */

export type ProductionWorkflowMode = 'quick' | 'production'

export type PreviewQualityTier = 'lightweight' | 'cinematic' | 'final'

export type BackgroundRenderStatus = 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled'

export interface LivePreviewState {
  revision: number
  lastChangeAt: string
  activeSceneIndex: number
  mode: ProductionWorkflowMode
  previewTier: PreviewQualityTier
}

export interface BackgroundRenderJob {
  id: string
  projectId: string
  episodeNumber: number
  status: BackgroundRenderStatus
  progress: number
  stage: string
  videoUrl?: string
  error?: string
  queuedAt: string
  updatedAt: string
}

export interface EmotionArcPoint {
  sceneIndex: number
  emotionalIntensity: number
  pacingIntensity: number
  soundtrackEnergy: number
  tension: number
  beatType?: string
}

export interface LiveFeedbackItem {
  id: string
  severity: 'info' | 'warn' | 'tip'
  sceneIndex?: number
  message: string
  fixTarget?: string
}

export interface LiveFeedbackReport {
  version: 1
  score: number
  suggestions: LiveFeedbackItem[]
  analyzedAt: string
}

export interface PreviewQualityProfile {
  motionScale: number
  vfxDensity: number
  particleDensity: number
  audioLayers: number
  sharpenPreview: number
  grain: number
  label: PreviewQualityTier
}

export interface DeviceOptimizationProfile {
  tier: 'low' | 'medium' | 'high'
  motionScale: number
  vfxDensity: number
  previewTier: PreviewQualityTier
}

/** Persisted on project — collaboration schema stub only. */
export interface ProductionPipelineProjectState {
  version: 1
  lastMode: ProductionWorkflowMode
  lastPreviewTier: PreviewQualityTier
  /** Future: shared project id for cloud sync */
  collaboration?: { schemaVersion: 1; projectSlug?: string }
}

export interface CollaborationStub {
  schemaVersion: 1
  /** Reserved for future multi-user session ids */
  sessionId?: string
}
