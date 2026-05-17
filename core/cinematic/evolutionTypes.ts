/** Phase 2 Final Evolution — reasoning, world, relationships, symbolism, director personality. */

import type { CinematicDirectorPlanV3, UltimateSceneExtensions } from './ultimateTypes'
import type { CinematicScenePlan } from './types'

export type DirectorPersonalityId =
  | 'hollywood_cinematic'
  | 'anime_director'
  | 'cozy_storybook'
  | 'dark_psychological'
  | 'experimental_art'
  | 'emotional_drama'
  | 'mystery_thriller'
  | 'fantasy_epic'
  | 'auto'

export type ThematicTag =
  | 'loneliness'
  | 'sacrifice'
  | 'revenge'
  | 'hope'
  | 'destiny'
  | 'corruption'
  | 'grief'
  | 'redemption'
  | 'obsession'
  | 'survival'
  | 'neutral'

export type MemorySequenceKind =
  | 'none'
  | 'flashback'
  | 'dream'
  | 'memory_fragment'
  | 'emotional_montage'
  | 'symbolic_vision'
  | 'nightmare'
  | 'recollection'

export interface CinematicReasoningState {
  emotionalState: string
  audienceExpectation: string
  thematicWeight: number
  cinematicImportance: number
  subtext: string
  narrativeMomentum: number
  symbolicWeight: number
  orchestrationPriority: 'atmosphere' | 'character' | 'action' | 'reveal' | 'theme'
}

export interface WorldSimulationState {
  version: 1
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'unknown'
  weatherTrend: string
  politicalTension: number
  warActive: boolean
  economyState: 'stable' | 'strained' | 'collapsed'
  damagedLocations: string[]
  evolvedLocations: string[]
  magicalCorruption: number
  culturalShift: string[]
  worldEvents: string[]
  updatedAt: string
}

export interface RelationshipEdge {
  from: string
  to: string
  trust: number
  loyalty: number
  fear: number
  romance: number
  rivalry: number
  traumaBond: number
  admiration: number
  hatred: number
  dependence: number
}

export interface DirectorPersonalityProfile {
  id: DirectorPersonalityId
  label: string
  cameraMul: number
  pacingMul: number
  actingMul: number
  musicIntensityMul: number
  transitionStyle: 'smooth' | 'sharp' | 'dreamlike' | 'gritty'
  atmosphereMul: number
  compositionBias: 'wide' | 'intimate' | 'dramatic' | 'experimental'
}

export interface SymbolismCue {
  themes: ThematicTag[]
  motifs: string[]
  colorTone: 'warm' | 'cool' | 'desaturated' | 'vivid' | 'monochrome'
  lightingSymbol: string
  recurringImagery: string[]
}

export interface ArtEvolutionCue {
  warmth: number
  contrast: number
  saturation: number
  atmosphereDensity: number
  shadowDepth: number
  progressionPhase: 'opening' | 'rising' | 'darkening' | 'healing' | 'climax' | 'resolution'
}

export interface MemorySequenceCue {
  kind: MemorySequenceKind
  intensity: number
  visualTreatment: 'desaturated' | 'soft_glow' | 'high_contrast' | 'grain' | 'none'
  audioTreatment: 'muffled' | 'echo' | 'distant' | 'normal'
}

export interface AdvancedRenderPipelineCue {
  architectureVersion: 1
  depthSimulation: number
  bloom: number
  volumetricFog: number
  cinematicBlur: number
  dynamicLighting: number
  lutPreset: string | null
  particleLayer: number
}

export interface TrailerRecapPlan {
  architectureVersion: 1
  highlightSceneIndices: number[]
  teaserLine: string
  recapMontageIndices: number[]
  soundtrackPeakIndex: number | null
}

export interface InteractiveStoryFoundation {
  architectureVersion: 1
  branchingEnabled: false
  choiceSlots: Array<{ id: string; label: string; consequenceHint: string }>
  alternateEndingSlots: string[]
}

export interface LipSyncFoundationMeta {
  architectureVersion: 1
  providerSlot: string
  emotionalLipSync: boolean
  perCharacterSlots: Array<{ characterName: string; slot: string }>
}

export interface CreatorPreferenceProfile {
  version: 1
  pacingBias: 'slow' | 'moderate' | 'fast'
  emotionalTone: string
  cinematicIntensity: number
  cameraStyle: string
  soundtrackTaste: string
  updatedAt: string
}

export interface EvolutionSceneExtensions {
  reasoning: CinematicReasoningState
  symbolism: SymbolismCue
  artEvolution: ArtEvolutionCue
  memorySequence: MemorySequenceCue
  renderPipeline: AdvancedRenderPipelineCue
}

export type CinematicDirectorPlanV4 = Omit<CinematicDirectorPlanV3, 'version' | 'scenes'> & {
  version: 4
  reasoningEngine?: { syncVersion: 1; episodeMomentum: number }
  worldSimulation?: WorldSimulationState
  relationships?: RelationshipEdge[]
  directorPersonality?: DirectorPersonalityProfile
  trailerRecap?: TrailerRecapPlan
  interactiveFoundation?: InteractiveStoryFoundation
  lipSyncFoundation?: LipSyncFoundationMeta
  creatorPreferences?: CreatorPreferenceProfile
  scenes: (CinematicScenePlan & UltimateSceneExtensions & EvolutionSceneExtensions)[]
}
