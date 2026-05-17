/** Unified scene orchestration pipeline — metadata attached to cinematicDirectorPlan. */

export type SceneBeatType =
  | 'dialogue'
  | 'action'
  | 'emotional'
  | 'suspense'
  | 'flashback'
  | 'reveal'
  | 'transition'
  | 'atmosphere'
  | 'world_building'
  | 'climax'
  | 'general'

export type TransitionStyle =
  | 'cut'
  | 'fade'
  | 'cinematic_dissolve'
  | 'anime_impact'
  | 'emotional_hold'
  | 'suspense_fade'
  | 'flashback_drift'
  | 'dream_soft'
  | 'environment_pan'

export interface EmotionProfile {
  primary: string
  sadness: number
  fear: number
  tension: number
  hope: number
  excitement: number
  mystery: number
  suspense: number
  warmth: number
  danger: number
  escalation: number
}

export interface SceneBreakdownUnit {
  sceneIndex: number
  beatType: SceneBeatType
  emotionalIntensity: number
  pacingProfile: 'slow' | 'moderate' | 'fast' | 'burst'
  cinematicImportance: number
  narration: string
  visualDescription: string
}

export interface SceneTransitionCue {
  fromIndex: number
  toIndex: number
  style: TransitionStyle
  durationMs: number
  crossfadeAudio: boolean
}

export interface NarrationScenePlan {
  sceneIndex: number
  pacingBias: number
  pauseBiasMs: number
  emphasis: 'low' | 'medium' | 'high'
  deliveryNotes: string
}

export interface SynchronizedLayerWindow {
  startMs: number
  endMs: number
}

export interface MasterTimelineV2 {
  syncVersion: 2
  secondsPerScene: number
  sceneCount: number
  totalDurationMs: number
  sceneBoundaries: Array<{ sceneIndex: number; startMs: number; endMs: number; durationMs: number }>
  transitions: SceneTransitionCue[]
}

export interface RenderAssemblyPlan {
  architectureVersion: 1
  sceneCount: number
  totalDurationMs: number
  secondsPerScene: number
  providerSlots: {
    narration: string
    images: string
    audioMix: string
    render: string
  }
  scenes: Array<{
    sceneIndex: number
    startMs: number
    endMs: number
    imageSlot: number
    narrationSlot: number
    subtitleWindow: SynchronizedLayerWindow
    transitionIn: TransitionStyle | null
  }>
}

export interface SceneOrchestrationPlan {
  version: 1
  pipelineStages: string[]
  sceneUnits: SceneBreakdownUnit[]
  emotionProfiles: EmotionProfile[]
  narrationPlans: NarrationScenePlan[]
  transitions: SceneTransitionCue[]
  masterTimeline: MasterTimelineV2
  renderAssembly: RenderAssemblyPlan
}
