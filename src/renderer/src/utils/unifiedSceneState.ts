import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import {
  computeLiveSceneImageCounts,
  resolveSceneImageStatus,
  sceneImageUrlForScene,
  sceneTitleForIndex,
  type SceneImageStatus
} from './sceneImageStatus'
import { sceneNarrationText, sceneHasVisualPrompt } from './pipelineCompletionAudit'
import { isEmergencySceneAsset, sceneAssetForIndex } from './pipelineCompletionAudit'
import { isPlaceholderSceneUrl } from './sceneImageValidationClient'

/** Single source of truth for scene pipeline state across UI surfaces. */
export type UnifiedSceneState = {
  index: number
  title: string
  imageUrl?: string
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
  const placeholder = rawUrl ? isPlaceholderSceneUrl(rawUrl) : false

  const displayImageUrl = (() => {
    if (!rawUrl) return undefined
    if (imageStatus === 'completed' && !invalidAsset && !placeholder) return rawUrl
    if (imageStatus === 'failed' && placeholder) return rawUrl
    if (imageStatus === 'failed' && rawUrl && !placeholder) return undefined
    if (imageStatus === 'generating' && rawUrl && !placeholder) return rawUrl
    return undefined
  })()

  const narrationReady = sceneNarrationText(scene).length > 0
  const scriptReady = sceneScriptReady(scene)
  const report = project?.pipelineValidationReport
  const episodeExportReady = report?.episodeNumber === epn ? report.exportReady : false

  return {
    index: scene.index,
    title: sceneTitleForIndex(episode, scene.index),
    imageUrl: rawUrl,
    displayImageUrl,
    imageStatus,
    imageError: scene.imageError,
    scriptReady,
    narrationReady,
    exportReady: episodeExportReady && imageStatus === 'completed' && scriptReady && narrationReady
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

export type SceneGenerationDiagnosticsView = {
  completed: number
  failed: number
  remaining: number
  needsAction: number
  total: number
  failedIndices: number[]
  currentScene: number | null
  retryAttempt: number | null
  maxRetries: number
  lastError: string | null
}

export function sceneGenerationDiagnostics(
  project: ProjectState | null | undefined,
  episode: StoryEpisode,
  opts?: {
    visualDiagnostics?: Array<{
      scene: number
      status: string
      retryCount?: number
      maxRetries?: number
      errorMessage?: string
    }> | null
    lastError?: string | null
  }
): SceneGenerationDiagnosticsView {
  const counts = computeLiveSceneImageCounts(project, episode.number)
  const failedIndices = (episode.scenes ?? [])
    .filter((s) => resolveSceneImageStatus(project, episode.number, s.index) === 'failed')
    .map((s) => s.index)

  const diagRows = opts?.visualDiagnostics ?? []
  const active = diagRows.find((d) => d.status === 'generating')
  const lastFailed = [...diagRows].reverse().find((d) => d.status === 'failed')
  const sceneErrors = (episode.scenes ?? [])
    .filter((s) => s.imageError)
    .map((s) => `Scene ${s.index}: ${s.imageError}`)
  const lastError =
    opts?.lastError ||
    lastFailed?.errorMessage ||
    sceneErrors[sceneErrors.length - 1] ||
    null

  return {
    completed: counts.completed,
    failed: counts.failed,
    remaining: counts.remaining,
    needsAction: counts.needsAction,
    total: counts.total,
    failedIndices,
    currentScene: active?.scene ?? null,
    retryAttempt: active?.retryCount != null ? active.retryCount + 1 : null,
    maxRetries: active?.maxRetries ?? lastFailed?.maxRetries ?? 3,
    lastError
  }
}
