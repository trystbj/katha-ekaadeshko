/** Cinematic director plan — provider-agnostic, consumed by pipeline, worker, and renderer. */

import type { VoiceProfile } from '../voice/types'

export type SceneEmotion =
  | 'neutral'
  | 'joy'
  | 'sadness'
  | 'fear'
  | 'anger'
  | 'surprise'
  | 'suspense'
  | 'wonder'
  | 'tension'
  | 'peace'

export type ExpressionMood =
  | 'neutral'
  | 'smile'
  | 'sad'
  | 'fear'
  | 'anger'
  | 'surprise'
  | 'determined'
  | 'anime_shock'
  | 'comic_wide'

export interface CharacterExpressionCue {
  mood: ExpressionMood
  intensity: number
  blinkRate: 'slow' | 'normal' | 'fast'
  eyeMotion: 'steady' | 'dart' | 'watery'
  breathVisible: boolean
  exaggeration: 'subtle' | 'normal' | 'high'
}

export interface AmbienceCue {
  tags: string[]
  intensity: number
}

export interface EnvironmentReactionCue {
  lightingMood: 'bright' | 'neutral' | 'dim' | 'dark' | 'mystic'
  fog: number
  rain: number
  wind: number
  particles: number
  shake: number
  warmth: number
  filterHint: string
}

export interface SceneAudioMixCue {
  musicGainMul: number
  sfxGainMul: number
  narratorGainMul: number
  silencePadMs: number
}

export interface SceneMotionCue {
  preset:
    | 'static'
    | 'slow_zoom_in'
    | 'cinematic_push'
    | 'pull_out'
    | 'parallax_float'
    | 'tilt_dramatic'
    | 'orbit_soft'
    | 'handheld_micro'
    | 'smooth_pan'
    | 'shake_dramatic'
    | 'ai_auto_motion'
}

export interface SceneSubtitleCue {
  revealBias: number
  leadInMs: number
  emphasis: 'low' | 'medium' | 'high'
  animationStyle: 'calm' | 'pulse' | 'dramatic' | 'karaoke'
}

export interface CinematicScenePlan {
  sceneIndex: number
  emotion: SceneEmotion
  tension: number
  actionLevel: number
  suspenseLevel: number
  expression: CharacterExpressionCue
  ambience: AmbienceCue
  environment: EnvironmentReactionCue
  audioMix: SceneAudioMixCue
  motion: SceneMotionCue
  subtitle: SceneSubtitleCue
}

export interface CinematicDirectorPlan {
  version: 2 | 3 | 4
  autoDirected: boolean
  suggestedNarratorId?: string
  voiceProfile: VoiceProfile
  scenes: CinematicScenePlan[]
}
