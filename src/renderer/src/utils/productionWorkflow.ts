import type { ProductionStage, ProjectState, SceneProductionStatus, StoryScene } from '../types/story'
import { sceneUrlForIndex } from './sceneAssetMap'

export type { ProductionStage, SceneProductionStatus }

export function hasEpisodeSceneImages(
  project: ProjectState | null | undefined,
  episodeNumber?: number
): boolean {
  if (!project?.episodes?.length) return false
  const epn = episodeNumber ?? project.episodes.find((e) => e.scenes?.length)?.number ?? project.episodes[0]?.number
  const ep = project.episodes.find((e) => e.number === epn) ?? project.episodes[0]
  if (!ep?.scenes?.length) return false
  return ep.scenes.some((s) => Boolean(sceneUrlForIndex(project, s.index)))
}

export function showScriptReviewWorkspace(project: ProjectState | null | undefined): boolean {
  if (!project?.bible || project.lastRenderVideoUrl) return false
  if (project.assetsGenerationApproved || project.storyboardReady) return false
  const stage = project.productionStage
  if (stage === 'visual_generation' || stage === 'narration_motion' || stage === 'video_assembly') {
    return false
  }
  if (hasEpisodeSceneImages(project)) return false
  return stage === 'script_review' || stage === 'writing' || Boolean(project.scriptReviewReady)
}

export function productionStageLabelKey(stage: ProductionStage | undefined): string {
  switch (stage) {
    case 'writing':
      return 'productionStageWriting'
    case 'script_review':
      return 'productionStageScriptReview'
    case 'visual_generation':
      return 'productionStageVisualGeneration'
    case 'narration_motion':
      return 'productionStageNarrationMotion'
    case 'video_assembly':
      return 'productionStageVideoAssembly'
    case 'export_complete':
      return 'productionStageExportComplete'
    default:
      return 'productionStageScriptReview'
  }
}

export function sceneStatusLabelKey(status: SceneProductionStatus | undefined): string {
  switch (status) {
    case 'script_ready':
      return 'sceneStatusScriptReady'
    case 'awaiting_review':
      return 'sceneStatusAwaitingReview'
    case 'scene_approved':
      return 'sceneStatusApproved'
    case 'queued':
      return 'sceneStatusQueued'
    case 'skipped':
      return 'sceneStatusSkipped'
    case 'generating_visuals':
      return 'sceneStatusGeneratingVisuals'
    case 'visual_ready':
      return 'sceneStatusVisualReady'
    case 'narration_ready':
      return 'sceneStatusNarrationReady'
    case 'video_ready':
      return 'sceneStatusVideoReady'
    default:
      return 'sceneStatusAwaitingReview'
  }
}

/** Re-open script review after storyboard was activated (saved / legacy projects). */
export function withScriptReviewReopened(project: ProjectState): ProjectState {
  const now = new Date().toISOString()
  return {
    ...project,
    productionStage: 'script_review',
    scriptReviewReady: true,
    storyboardReady: false,
    storyboardPartial: undefined,
    workflowPhase: 'idle',
    assetsGenerationApproved: false,
    assetsGenerationApprovedAt: undefined,
    missingSceneImageIndices: undefined,
    updatedAt: now
  }
}

export function withScriptReviewReady(project: ProjectState): ProjectState {
  const now = new Date().toISOString()
  const ep = project.episodes[0]
  const scenes = (ep?.scenes ?? []).map((s) => ({
    ...s,
    productionStatus: (s.productionStatus === 'skipped' ? 'skipped' : 'awaiting_review') as SceneProductionStatus
  }))
  return {
    ...project,
    productionStage: 'script_review',
    scriptReviewReady: true,
    scriptReviewReadyAt: now,
    storyboardReady: false,
    storyboardPartial: undefined,
    workflowPhase: 'idle',
    assetsGenerationApproved: false,
    missingSceneImageIndices: undefined,
    episodes: ep ? [{ ...ep, scenes }] : project.episodes,
    updatedAt: now
  }
}

export function withVisualGenerationStarted(project: ProjectState): ProjectState {
  return {
    ...project,
    productionStage: 'visual_generation',
    updatedAt: new Date().toISOString()
  }
}

export function withVisualGenerationComplete(project: ProjectState): ProjectState {
  const now = new Date().toISOString()
  const ep = project.episodes[0]
  const scenes = (ep?.scenes ?? []).map((s) => {
    const url = sceneUrlForIndex(project, s.index)
    if (s.productionStatus === 'skipped') return s
    return {
      ...s,
      productionStatus: (url ? 'visual_ready' : 'awaiting_review') as SceneProductionStatus
    }
  })
  return {
    ...project,
    productionStage: 'narration_motion',
    episodes: ep ? [{ ...ep, scenes }] : project.episodes,
    updatedAt: now
  }
}

export function patchSceneProductionStatus(
  scenes: StoryScene[],
  sceneIndex: number,
  status: SceneProductionStatus
): StoryScene[] {
  return scenes.map((s) => (s.index === sceneIndex ? { ...s, productionStatus: status } : s))
}

export function parsePipelinePayloadFromEpisode(episode: { rawStructured?: string } | undefined): {
  story: Record<string, unknown>
  script: Record<string, unknown>[]
  images: Record<string, unknown>[]
  metadata?: Record<string, unknown>
} | null {
  if (!episode?.rawStructured) return null
  try {
    const raw = JSON.parse(episode.rawStructured) as {
      story?: Record<string, unknown>
      script?: Record<string, unknown>[]
      images?: Record<string, unknown>[]
      metadata?: Record<string, unknown>
    }
    if (!raw?.story || !Array.isArray(raw.script)) return null
    return {
      story: raw.story,
      script: raw.script,
      images: Array.isArray(raw.images) ? raw.images : [],
      metadata: raw.metadata
    }
  } catch {
    return null
  }
}

export function withVideoGenerationStarted(project: ProjectState): ProjectState {
  return {
    ...project,
    productionStage: 'video_assembly',
    updatedAt: new Date().toISOString()
  }
}

export function withVideoGenerationComplete(project: ProjectState): ProjectState {
  const now = new Date().toISOString()
  const ep = project.episodes[0]
  const scenes = (ep?.scenes ?? []).map((s) => {
    if (s.productionStatus === 'skipped') return s
    return {
      ...s,
      productionStatus: 'video_ready' as SceneProductionStatus,
      generationStatus: 'motion' as const
    }
  })
  return {
    ...project,
    productionStage: 'video_assembly',
    episodes: ep ? [{ ...ep, scenes }] : project.episodes,
    updatedAt: now
  }
}
