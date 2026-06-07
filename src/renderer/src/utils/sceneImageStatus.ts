import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { sceneIndexFromPipelineRow, sceneUrlForIndex } from './sceneAssetMap'
import { isPlaceholderSceneUrl } from './sceneImageValidationClient'
import type { PipelineImageRow } from './visualStreamRecovery'

const EMERGENCY_SCENE_PROMPT_TAG = '[emergency_fallback]'

export type SceneImageStatus = 'pending' | 'generating' | 'completed' | 'failed'

function sceneAssetForIndex(
  project: ProjectState | null | undefined,
  sceneIndex: number
) {
  if (!project?.assets?.length || !sceneIndex) return undefined
  return project.assets.find((a) => a.kind === 'scene' && a.key === `scene:${sceneIndex}`)
}

function isInvalidSceneAsset(asset: ReturnType<typeof sceneAssetForIndex>): boolean {
  if (!asset) return false
  if (String(asset.prompt || '').includes(EMERGENCY_SCENE_PROMPT_TAG)) return true
  return isPlaceholderSceneUrl(String(asset.url || ''))
}

export function sceneImageUrlForScene(
  project: ProjectState | null | undefined,
  scene: StoryScene
): string | undefined {
  const fromScene = String(scene.imageUrl || '').trim()
  if (fromScene) return fromScene
  return sceneUrlForIndex(project, scene.index)
}

export function resolveSceneImageStatus(
  project: ProjectState | null | undefined,
  episodeNumber: number,
  sceneIndex: number
): SceneImageStatus {
  const ep = project?.episodes.find((e) => e.number === episodeNumber)
  const scene = ep?.scenes.find((s) => s.index === sceneIndex)
  if (!scene) return 'pending'

  if (scene.imageStatus === 'generating' || scene.productionStatus === 'generating_visuals') {
    return 'generating'
  }

  const report = project?.pipelineValidationReport
  if (report?.episodeNumber === episodeNumber) {
    const row = report.scenes.find((r) => r.scene === sceneIndex)
    if (row) {
      if (row.image === 'ok' && row.preview === 'ok') return 'completed'
      if (row.image === 'missing') return 'pending'
      return 'failed'
    }
  }

  if (scene.imageStatus === 'completed') {
    const url = sceneImageUrlForScene(project, scene)
    const asset = sceneAssetForIndex(project, sceneIndex)
    if (url && !isInvalidSceneAsset(asset)) return 'completed'
    return 'failed'
  }

  if (scene.imageStatus === 'failed' || scene.generationStatus === 'image_failed') return 'failed'

  const url = sceneImageUrlForScene(project, scene)
  if (!url) return 'pending'
  const asset = sceneAssetForIndex(project, sceneIndex)
  if (isInvalidSceneAsset(asset)) return 'failed'
  return scene.imageStatus === 'pending' ? 'pending' : 'failed'
}

export function isSceneImageCompleted(
  project: ProjectState | null | undefined,
  episodeNumber: number,
  sceneIndex: number
): boolean {
  return resolveSceneImageStatus(project, episodeNumber, sceneIndex) === 'completed'
}

/** Scenes that still need Leonardo stills — never includes validated completed scenes. */
export function getScenesNeedingImageRegeneration(
  project: ProjectState | null | undefined,
  episodeNumber: number
): number[] {
  const ep = project?.episodes.find((e) => e.number === episodeNumber) ?? project?.episodes[0]
  if (!ep?.scenes?.length) return []

  const report = project?.pipelineValidationReport
  if (report?.episodeNumber === episodeNumber && report.scenes.length) {
    return report.scenes
      .filter((r) => r.image !== 'ok' || r.preview !== 'ok')
      .map((r) => r.scene)
      .sort((a, b) => a - b)
  }

  return ep.scenes
    .filter((s) => resolveSceneImageStatus(project, episodeNumber, s.index) !== 'completed')
    .map((s) => s.index)
    .sort((a, b) => a - b)
}

export function countCompletedSceneImages(
  project: ProjectState | null | undefined,
  episodeNumber: number
): { completed: number; total: number } {
  const ep = project?.episodes.find((e) => e.number === episodeNumber) ?? project?.episodes[0]
  const scenes = ep?.scenes ?? []
  const report = project?.pipelineValidationReport
  if (report?.episodeNumber === episodeNumber && report.totalScenes === scenes.length) {
    return { completed: report.validatedImageCount, total: report.totalScenes }
  }
  const completed = scenes.filter((s) =>
    isSceneImageCompleted(project, episodeNumber, s.index)
  ).length
  return { completed, total: scenes.length }
}

/**
 * Build retry queue — explicit requests minus completed unless forceRegenerate.
 * Default (no explicit list) returns only missing/failed/pending scenes.
 */
export function buildSceneImageRegenerationQueue(
  project: ProjectState,
  episodeNumber: number,
  opts?: { sceneIndices?: number[]; forceRegenerate?: boolean }
): number[] {
  const need = getScenesNeedingImageRegeneration(project, episodeNumber)
  if (!opts?.sceneIndices?.length) return need

  const requested = [...new Set(opts.sceneIndices.map(Number).filter((n) => n > 0))].sort(
    (a, b) => a - b
  )
  if (opts.forceRegenerate) return requested

  const filtered = requested.filter((ix) => !isSceneImageCompleted(project, episodeNumber, ix))
  return filtered.length ? filtered : requested.filter((ix) => need.includes(ix))
}

export function filterPipelineImagesToScenes(
  images: PipelineImageRow[],
  allowedSceneIndices: Set<number>
): PipelineImageRow[] {
  if (!allowedSceneIndices.size) return []
  return images.filter((row) => {
    const sceneNum = sceneIndexFromPipelineRow(row, Number(row.scene) || 0)
    return sceneNum > 0 && allowedSceneIndices.has(sceneNum)
  })
}

export function sceneTitleForIndex(episode: StoryEpisode | undefined, sceneIndex: number): string {
  const sc = episode?.scenes.find((s) => s.index === sceneIndex)
  return sc?.sceneTitle?.trim() || `Scene ${sceneIndex}`
}

export function logMissingSceneImageReport(
  project: ProjectState,
  episode: StoryEpisode
): void {
  const need = getScenesNeedingImageRegeneration(project, episode.number)
  if (!need.length) {
    console.info('[katha:scene-image]', 'missing_scene_report', { episode: episode.number, missing: [] })
    return
  }
  const rows = need.map((sceneIndex) => {
    const sc = episode.scenes.find((s) => s.index === sceneIndex)
    return {
      sceneId: sceneIndex,
      sceneTitle: sceneTitleForIndex(episode, sceneIndex),
      status: resolveSceneImageStatus(project, episode.number, sceneIndex),
      imageUrl: sceneImageUrlForScene(project, sc!)?.slice(0, 120) || null,
      imageError: sc?.imageError || sc?.generationStatus || null
    }
  })
  console.info('[katha:scene-image]', 'missing_scene_report', {
    episode: episode.number,
    count: need.length,
    missing: rows
  })
}

export function formatSceneImageIncompleteMessage(
  project: ProjectState,
  episode: StoryEpisode,
  uiText: (key: string, opts?: Record<string, string | number | boolean | null>) => string
): string {
  const { completed, total } = countCompletedSceneImages(project, episode.number)
  const need = getScenesNeedingImageRegeneration(project, episode.number)
  logMissingSceneImageReport(project, episode)

  if (need.length === 1) {
    const title = sceneTitleForIndex(episode, need[0])
    const sc = episode.scenes.find((s) => s.index === need[0])
    const status = sc?.imageStatus || 'failed'
    if (status === 'failed') {
      return uiText('visualStorySceneFailed', { scene: title })
    }
    return uiText('visualStoryOneSceneRemaining', { scene: title })
  }
  if (need.length > 1) {
    return uiText('visualStoryScenesRemaining', {
      count: String(need.length),
      generated: String(completed),
      total: String(total)
    })
  }
  return uiText('visualStoryIncomplete', { generated: String(completed), total: String(total) })
}

export function patchSceneImageStatusFields(
  scene: StoryScene,
  patch: {
    imageStatus: SceneImageStatus
    imageUrl?: string
    imageError?: string
    lastGenerationAttempt?: string
  }
): StoryScene {
  return {
    ...scene,
    imageStatus: patch.imageStatus,
    ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
    ...(patch.imageError !== undefined ? { imageError: patch.imageError } : {}),
    ...(patch.lastGenerationAttempt
      ? { lastGenerationAttempt: patch.lastGenerationAttempt }
      : { lastGenerationAttempt: new Date().toISOString() })
  }
}

export function syncEpisodeSceneImageStatuses(
  project: ProjectState,
  episodeNumber: number
): ProjectState {
  const now = new Date().toISOString()
  return {
    ...project,
    episodes: project.episodes.map((e) =>
      e.number !== episodeNumber
        ? e
        : {
            ...e,
            scenes: e.scenes.map((s) => {
              const status = resolveSceneImageStatus(project, episodeNumber, s.index)
              const url = sceneImageUrlForScene(project, s)
              return patchSceneImageStatusFields(s, {
                imageStatus: status,
                imageUrl: url,
                imageError: status === 'failed' ? s.imageError || 'Image validation failed' : undefined,
                lastGenerationAttempt: s.lastGenerationAttempt || now
              })
            })
          }
    ),
    updatedAt: now
  }
}
