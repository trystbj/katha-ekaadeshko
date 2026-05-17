/**
 * Modular engine foundation — facades over existing cinematic, voice, and pipeline systems.
 * Import from `@core/engines` in renderer (via path alias) or relative paths in backend.
 */

export * from './timeline/types'
export * from './timeline/resolvePlaybackTimeline'

/** Timeline orchestration (backend). */
export const timelineEngine = {
  module: 'backend/cinematic/timelineOrchestrator.js'
} as const

/** Cinematic director v2–v4 (backend). */
export const cinematicEngine = {
  v2: 'backend/cinematic/cinematicDirector.js',
  v3: 'backend/cinematic/cinematicOrchestrator.js',
  v4: 'backend/cinematic/evolutionOrchestrator.js'
} as const

/** Narration / TTS (backend + renderer voice). */
export const narrationEngine = {
  backend: 'backend/voice/',
  renderer: 'src/renderer/src/voice/'
} as const

/** Subtitle timing (renderer WebVTT + voice adapter). */
export const subtitleEngine = {
  webVtt: 'src/renderer/src/utils/scenesWebVtt.ts',
  timingAdapter: 'src/renderer/src/voice/subtitleTimingAdapter.ts'
} as const

/** Style presets (renderer types + pipeline visual lock). */
export const styleEngine = {
  presets: 'src/renderer/src/types/story.ts',
  pipeline: 'backend/utils/visualStyleProfiles.js'
} as const

/** Project persistence (store + bridge). */
export const projectEngine = {
  store: 'src/renderer/src/store/useStudioStore.ts',
  workspace: 'src/renderer/src/utils/workspaceSlotsStorage.ts'
} as const

/** Render queue (API + worker). */
export const renderEngine = {
  api: 'api/render',
  worker: 'worker/worker.js'
} as const

/** Unified scene orchestration pipeline (backend). */
export const sceneOrchestrationPipeline = {
  entry: 'backend/cinematic/pipeline/sceneOrchestrationPipeline.js',
  stages: [
    'scene_breakdown',
    'emotion_analysis',
    'narration_planning',
    'transition_planning',
    'timeline_synchronization',
    'render_assembly'
  ]
} as const
