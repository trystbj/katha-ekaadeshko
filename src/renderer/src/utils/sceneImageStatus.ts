import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { sceneIndexFromPipelineRow, sceneUrlForIndex } from './sceneAssetMap'
import { isPlaceholderSceneUrl } from './sceneImageValidationClient'
import type { PipelineImageRow } from './visualStreamRecovery'

const EMERGENCY_SCENE_PROMPT_TAG = '[emergency_fallback]'

export type SceneImageStatus = 'pending' | 'generating' | 'completed' | 'failed'

export type LiveSceneImageCounts = {
  completed: number
  failed: number
  remaining: number
  total: number
  needsAction: number
}

function sceneAssetForIndex(
  project: ProjectState | null | undefined,
  sceneIndex: number
) {
  if (!project?.assets?.length || !sceneIndex) return undefined
  return project.assets.find((a) => a.kind === 'scene' && a.key === `scene:${sceneIndex}`)
}

function isInvalidSceneAsset(asset: ReturnType<typeof sceneAssetForIndex>): boolean {
  if (!asset) return false
  if (String(asset.prompt || '').includes(EMERGENCY_SCENE_PROMPT_TAG)) return false
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

/** Preview-safe URL — completed stills + readable SVG fallbacks; never seasonal bleed sources. */
export function sceneUrlForPreviewDisplay(
  project: ProjectState | null | undefined,
  episodeNumber: number,
  scene: StoryScene
): string {
  const raw = String(sceneImageUrlForScene(project, scene) || '').trim()
  if (!raw) return ''
  const status = resolveSceneImageStatus(project, episodeNumber, scene.index)
  if (status === 'completed') return isPlaceholderSceneUrl(raw) ? '' : raw
  if (status === 'failed' && isPlaceholderSceneUrl(raw)) return raw
  if (status === 'generating' && !isPlaceholderSceneUrl(raw)) return raw
  return ''
}

/** Live status — never read cached report counters for display. */
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

  if (scene.imageStatus === 'failed' || scene.generationStatus === 'image_failed') {
    return 'failed'
  }

  if (scene.imageStatus === 'completed') {
    const url = sceneImageUrlForScene(project, scene)
    if (!url) return 'failed'
    const asset = sceneAssetForIndex(project, sceneIndex)
    if (isInvalidSceneAsset(asset)) return 'failed'
    return 'completed'
  }

  const url = sceneImageUrlForScene(project, scene)
  if (!url) return 'pending'
  const asset = sceneAssetForIndex(project, sceneIndex)
  if (isInvalidSceneAsset(asset)) return 'failed'
  return 'pending'
}

export function isSceneImageCompleted(
  project: ProjectState | null | undefined,
  episodeNumber: number,
  sceneIndex: number
): boolean {
  return resolveSceneImageStatus(project, episodeNumber, sceneIndex) === 'completed'
}

export function getEpisodeScenes(
  project: ProjectState | null | undefined,
  episodeNumber: number
): StoryScene[] {
  const ep = project?.episodes.find((e) => e.number === episodeNumber) ?? project?.episodes[0]
  return ep?.scenes ?? []
}

/** Single live counter source — never cache. */
export function computeLiveSceneImageCounts(
  project: ProjectState | null | undefined,
  episodeNumber: number
): LiveSceneImageCounts {
  const scenes = getEpisodeScenes(project, episodeNumber)
  let completed = 0
  let failed = 0
  let remaining = 0
  for (const s of scenes) {
    const st = resolveSceneImageStatus(project, episodeNumber, s.index)
    if (st === 'completed') completed += 1
    else if (st === 'failed') failed += 1
    else remaining += 1
  }
  return {
    completed,
    failed,
    remaining,
    total: scenes.length,
    needsAction: failed + remaining
  }
}

export function getFailedSceneIndices(
  project: ProjectState | null | undefined,
  episodeNumber: number
): number[] {
  return getEpisodeScenes(project, episodeNumber)
    .filter((s) => resolveSceneImageStatus(project, episodeNumber, s.index) === 'failed')
    .map((s) => s.index)
    .sort((a, b) => a - b)
}

/** Scenes still missing a validated completed still. */
export function getScenesNeedingImageRegeneration(
  project: ProjectState | null | undefined,
  episodeNumber: number
): number[] {
  return getEpisodeScenes(project, episodeNumber)
    .filter((s) => resolveSceneImageStatus(project, episodeNumber, s.index) !== 'completed')
    .map((s) => s.index)
    .sort((a, b) => a - b)
}

export function countCompletedSceneImages(
  project: ProjectState | null | undefined,
  episodeNumber: number
): { completed: number; total: number } {
  const counts = computeLiveSceneImageCounts(project, episodeNumber)
  return { completed: counts.completed, total: counts.total }
}

/**
 * Build retry queue.
 * retryFailedOnly — restrict to failed scenes (Retry Failed Scenes button).
 */
export function buildSceneImageRegenerationQueue(
  project: ProjectState,
  episodeNumber: number,
  opts?: {
    sceneIndices?: number[]
    forceRegenerate?: boolean
    retryFailedOnly?: boolean
  }
): number[] {
  const failed = getFailedSceneIndices(project, episodeNumber)
  const need = getScenesNeedingImageRegeneration(project, episodeNumber)

  if (opts?.retryFailedOnly) {
    const pool = failed.length ? failed : need.filter((ix) =>
      resolveSceneImageStatus(project, episodeNumber, ix) === 'failed'
    )
    if (!opts.sceneIndices?.length) return pool
    const requested = new Set(opts.sceneIndices.map(Number).filter((n) => n > 0))
    return pool.filter((ix) => requested.has(ix))
  }

  if (!opts?.sceneIndices?.length) return need

  const requested = [...new Set(opts.sceneIndices.map(Number).filter((n) => n > 0))].sort(
    (a, b) => a - b
  )
  if (opts.forceRegenerate) return requested

  const filtered = requested.filter((ix) => !isSceneImageCompleted(project, episodeNumber, ix))
  return filtered.length ? filtered : requested.filter((ix) => need.includes(ix))
}

/** Preview URLs aligned 1:1 with episode.scenes order — no cross-scene fallback. */
export function scenePreviewUrlsAligned(
  project: ProjectState | null | undefined,
  episode: StoryEpisode
): string[] {
  return (episode.scenes ?? []).map((s) =>
    sceneUrlForPreviewDisplay(project, episode.number, s)
  )
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
  const counts = computeLiveSceneImageCounts(project, episode.number)
  const need = getScenesNeedingImageRegeneration(project, episode.number)
  const failed = getFailedSceneIndices(project, episode.number)
  console.info('[katha:scene-image]', 'live_scene_report', {
    episode: episode.number,
    counts,
    failed,
    need
  })
  if (!need.length) return
  const rows = need.map((sceneIndex) => {
    const sc = episode.scenes.find((s) => s.index === sceneIndex)
    return {
      sceneId: sceneIndex,
      sceneTitle: sceneTitleForIndex(episode, sceneIndex),
      status: resolveSceneImageStatus(project, episode.number, sceneIndex),
      imageUrl: sc ? sceneImageUrlForScene(project, sc)?.slice(0, 120) || null : null,
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
  const counts = computeLiveSceneImageCounts(project, episode.number)
  const need = getScenesNeedingImageRegeneration(project, episode.number)
  logMissingSceneImageReport(project, episode)

  if (need.length === 1) {
    const title = sceneTitleForIndex(episode, need[0])
    const status = resolveSceneImageStatus(project, episode.number, need[0])
    if (status === 'failed') {
      return uiText('visualStorySceneFailed', { scene: title })
    }
    return uiText('visualStoryOneSceneRemaining', { scene: title })
  }
  if (need.length > 1) {
    return uiText('visualStoryScenesRemaining', {
      count: String(need.length),
      generated: String(counts.completed),
      total: String(counts.total)
    })
  }
  return uiText('visualStoryIncomplete', {
    generated: String(counts.completed),
    total: String(counts.total)
  })
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
                imageError:
                  status === 'failed'
                    ? s.imageError || 'Image generation failed'
                    : undefined,
                lastGenerationAttempt: s.lastGenerationAttempt || now
              })
            })
          }
    ),
    updatedAt: now
  }
}

export { EMERGENCY_SCENE_PROMPT_TAG }
