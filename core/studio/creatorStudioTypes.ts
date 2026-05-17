/** AI + Creator hybrid studio — non-destructive edits & regeneration targets. */

export type RegenerationTarget =
  | 'visuals'
  | 'narration'
  | 'subtitles'
  | 'soundtrack'
  | 'ambience'
  | 'transitions'
  | 'acting'
  | 'camera'
  | 'pacing'
  | 'full_scene'

export type CopilotPatchDomain =
  | 'emotion'
  | 'pacing'
  | 'camera'
  | 'ambience'
  | 'music'
  | 'subtitles'
  | 'acting'
  | 'transitions'
  | 'style'
  | 'intensity'

export interface CopilotScenePatch {
  sceneIndex: number
  domain: CopilotPatchDomain
  delta: Record<string, number | string | boolean>
  summary: string
}

export interface SceneCreatorOverride {
  sceneIndex: number
  emotionBias?: string
  pacingMul?: number
  cameraIntensityMul?: number
  musicIntensityMul?: number
  ambienceMul?: number
  subtitleLeadInMs?: number
  transitionStyle?: string
  motionIntensityMul?: number
  locked?: boolean
  notes?: string
}

export interface CreatorHistoryEntry {
  id: string
  label: string
  at: string
  episodeNumber: number
  snapshot: string
}

export interface CreatorPreset {
  id: string
  name: string
  pacingBias: 'slow' | 'moderate' | 'fast'
  cameraStyle: string
  emotionalIntensity: number
  subtitleStyle: string
  transitionStyle: string
  directorPersonality?: string
}

export interface QualitySuggestion {
  id: string
  severity: 'info' | 'warn' | 'tip'
  sceneIndex?: number
  message: string
  fixTarget?: RegenerationTarget
}

export interface CreatorStudioProjectState {
  version: 1
  sceneOverrides: Record<string, SceneCreatorOverride>
  history: CreatorHistoryEntry[]
  historyIndex: number
  presets: CreatorPreset[]
}

export interface ExportFormatHint {
  id: string
  label: string
  aspect: 'vertical_9_16' | 'horizontal_16_9'
  providerSlot: string
  enabled: boolean
}
