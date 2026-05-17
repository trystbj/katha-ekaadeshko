/** Phase 2 Ultimate — camera, acting, memory, music, timeline, VFX (extends base cinematic types). */

import type { CinematicDirectorPlan, CinematicScenePlan } from './types'

export type CameraShotType = 'wide' | 'medium' | 'closeup' | 'extreme_closeup' | 'impact' | 'environment'
export type CameraFocusShift = 'none' | 'character' | 'environment' | 'reveal' | 'dual'

export interface CameraDirectorCue {
  shotType: CameraShotType
  focusShift: CameraFocusShift
  parallaxDepth: number
  breathing: number
  shakeIntensity: number
  emphasis: 'static' | 'push' | 'pull' | 'pan' | 'orbit' | 'impact'
}

export interface CharacterActingCue {
  idleMotion: 'still' | 'subtle' | 'nervous' | 'energetic'
  posture: 'neutral' | 'tense' | 'slumped' | 'upright' | 'defensive'
  headTilt: number
  gestureIntensity: number
  reactionDelayMs: number
  stillnessMoment: boolean
}

export interface SceneCompositionCue {
  depthLayering: 'flat' | 'medium' | 'deep'
  subjectPlacement: 'center' | 'left_third' | 'right_third' | 'low_frame'
  foregroundWeight: number
  lightingFocus: 'character' | 'environment' | 'balanced' | 'silhouette'
  readability: number
}

export interface VisualEffectsCue {
  rain: number
  snow: number
  fog: number
  magicalGlow: number
  speedLines: number
  impactFlash: number
  dust: number
  lightRays: number
  embers: number
  intensity: number
}

export type MusicThemeTag =
  | 'neutral'
  | 'mystery'
  | 'horror_drone'
  | 'battle'
  | 'fantasy_ambient'
  | 'emotional_piano'
  | 'climax'
  | 'peaceful'

export interface SceneMusicCue {
  theme: MusicThemeTag
  transition: 'hold' | 'fade_in' | 'fade_out' | 'swell' | 'cut'
  intensity: number
  silenceBeforeMs: number
}

export interface ScenePacingBeat {
  beatWeight: number
  pauseAfterMs: number
  tensionContribution: number
  breathingSpace: boolean
}

export interface SceneTimelineLayers {
  sceneIndex: number
  durationMs: number
  layers: {
    narration: { startMs: number; endMs: number }
    subtitles: { startMs: number; endMs: number }
    music: { startMs: number; endMs: number; theme: MusicThemeTag }
    ambience: { startMs: number; endMs: number }
    sfx: { startMs: number; endMs: number }
    camera: { startMs: number; endMs: number }
    expression: { startMs: number; endMs: number }
    vfx: { startMs: number; endMs: number }
  }
}

export interface StoryMemoryCharacterState {
  name: string
  personality: string
  emotionalState: string
  relationships: string[]
  traits: string[]
}

export interface StoryMemorySnapshot {
  version: 1
  characters: StoryMemoryCharacterState[]
  plotBeats: string[]
  emotionalHistory: string[]
  worldRules: string[]
  locations: string[]
  continuityLocks: string[]
  updatedAt: string
}

export interface EpisodePacingPlan {
  globalTempo: 'slow' | 'moderate' | 'fast'
  climaxSceneIndex: number
  calmScenes: number[]
  tensionCurve: number[]
}

export interface CliffhangerPlan {
  hookType: 'suspense' | 'emotional' | 'mystery' | 'action_tease' | 'revelation'
  intensity: number
  suggestedLine: string
  teaseNextEpisode: boolean
}

export interface CharacterVoiceCastEntry {
  characterName: string
  suggestedGender: string
  language: string
  personalityVoice: string
  providerSlot: string
}

export type PerformanceTier = 'low' | 'balanced' | 'high'

export interface SmartPerformanceProfile {
  tier: PerformanceTier
  motionQuality: number
  vfxDensity: number
  audioLayerCap: number
  particleCap: number
}

export interface CommunityFoundationMeta {
  architectureVersion: 1
  publishReady: boolean
  remixTemplateId: string | null
  suggestedTags: string[]
  creatorProfileSlot: string | null
}

export interface UltimateSceneExtensions {
  camera: CameraDirectorCue
  acting: CharacterActingCue
  composition: SceneCompositionCue
  vfx: VisualEffectsCue
  music: SceneMusicCue
  pacing: ScenePacingBeat
  timeline: SceneTimelineLayers
}

export type CinematicDirectorPlanV3 = CinematicDirectorPlan & {
  version: 3
  storyMemory?: StoryMemorySnapshot
  episodePacing?: EpisodePacingPlan
  cliffhanger?: CliffhangerPlan
  performance?: SmartPerformanceProfile
  community?: CommunityFoundationMeta
  multiCharacterVoices?: CharacterVoiceCastEntry[]
  masterTimeline?: { secondsPerScene: number; sceneCount: number; syncVersion: 1 }
  scenes: (CinematicScenePlan & UltimateSceneExtensions)[]
}
