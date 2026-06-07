import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import {
  resolveSceneImageStatus,
  sceneImageUrlForScene,
  sceneTitleForIndex,
  type SceneImageStatus
} from './sceneImageStatus'
import { sceneNarrationText, sceneHasVisualPrompt } from './pipelineCompletionAudit'
import { isEmergencySceneAsset, sceneAssetForIndex } from './pipelineCompletionAudit'

/** Single source of truth for scene pipeline state across UI surfaces. */
export type UnifiedSceneState = {
  index: number
  title: string
  imageUrl?: string
  /** URL safe to render in preview/thumbnails (validated completed only). */
  displayImageUrl?: string
  imageStatus: SceneImageStatus
  imageError?: string
  scriptReady: boolean
  narrationReady: boolean
  exportReady: boolean
}

function sceneScriptReady(scene: StoryScene): boolean {
  return sceneNarrationText(scene).length > 0 || sceneHasVisualPrompt(scene)
}

export function buildUnifiedSceneState(
  project: ProjectState | null | undefined,
  episode: StoryEpisode,
  scene: StoryScene
): UnifiedSceneState {
  const epn = episode.number
  const imageStatus = resolveSceneImageStatus(project, epn, scene.index)
  const rawUrl = sceneImageUrlForScene(project, scene)
  const asset = sceneAssetForIndex(project, scene.index)
  const invalidAsset = isEmergencySceneAsset(asset)
  const report = project?.pipelineValidationReport
  const row = report?.episodeNumber === epn ? report.scenes.find((r) => r.scene === scene.index) : null
  const validatedOk = row ? row.image === 'ok' && row.preview === 'ok' : imageStatus === 'completed'
  const displayImageUrl =
    validatedOk && rawUrl && !invalidAsset ? rawUrl : undefined

  const narrationReady = sceneNarrationText(scene).length > 0
  const scriptReady = sceneScriptReady(scene)
  const episodeExportReady = report?.episodeNumber === epn ? report.exportReady : false

  return {
    index: scene.index,
    title: sceneTitleForIndex(episode, scene.index),
    imageUrl: rawUrl,
    displayImageUrl,
    imageStatus: validatedOk ? 'completed' : imageStatus,
    imageError: scene.imageError,
    scriptReady,
    narrationReady,
    exportReady: episodeExportReady && validatedOk && scriptReady && narrationReady
  }
}

export function buildUnifiedSceneStates(
  project: ProjectState | null | undefined,
  episode: StoryEpisode
): UnifiedSceneState[] {
  return (episode.scenes ?? []).map((s) => buildUnifiedSceneState(project, episode, s))
}

export function displayUrlsForEpisodeScenes(
  project: ProjectState | null | undefined,
  episode: StoryEpisode
): string[] {
  return buildUnifiedSceneStates(project, episode).map((s) => s.displayImageUrl ?? '')
}

export function sceneGenerationDiagnostics(
  project: ProjectState | null | undefined,
  episode: StoryEpisode
): {
  completed: number
  failed: number
  remaining: number
  total: number
  failedIndices: number[]
} {
  const states = buildUnifiedSceneStates(project, episode)
  const completed = states.filter((s) => s.imageStatus === 'completed').length
  const failed = states.filter((s) => s.imageStatus === 'failed').length
  const remaining = states.filter(
    (s) => s.imageStatus === 'pending' || s.imageStatus === 'generating' || s.imageStatus === 'failed'
  ).length
  return {
    completed,
    failed,
    remaining,
    total: states.length,
    failedIndices: states.filter((s) => s.imageStatus !== 'completed').map((s) => s.index)
  }
}
