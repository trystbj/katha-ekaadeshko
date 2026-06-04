import type { ProjectState } from '../types/story'
import { sceneUrlForIndex } from './sceneAssetMap'
import { episodeSceneImageCoverage } from './storyboardWorkflow'
import { sceneImageStateFromValidation } from './scenePipelineStatus'

/** Centralized cinematic pipeline gate — drives unlock states without layout changes. */
export type CinematicProductionGate = {
  storyGenerated: boolean
  sceneImagesGenerated: boolean
  charactersGenerated: boolean
  assetsReviewed: boolean
  videoReady: boolean
}

export function deriveCinematicProductionGate(
  project: ProjectState | null | undefined,
  episodeNumber?: number
): CinematicProductionGate & {
  coverage: ReturnType<typeof episodeSceneImageCoverage>
  canRenderFinalVideo: boolean
  sceneImagesPartial: boolean
  narrationGenerated: boolean
  validationPassed: boolean
} {
  const epn =
    episodeNumber ??
    project?.episodes.find((e) => e.scenes?.length)?.number ??
    project?.episodes[0]?.number ??
    1
  const coverage = episodeSceneImageCoverage(project, epn)
  const storyGenerated = Boolean(project?.bible && coverage.total > 0)
  const pipelineReport = project?.pipelineValidationReport
  const validatedReady =
    pipelineReport?.episodeNumber === epn && pipelineReport.animationReady
  const healReport = project?.sceneImageGenerationReport
  const reportAllowsExport =
    validatedReady || !healReport || healReport.storyReadyForAnimation === true
  const sceneImagesGenerated =
    coverage.total > 0 &&
    coverage.missing.length === 0 &&
    project?.sceneImagesComplete !== false &&
    reportAllowsExport &&
    (pipelineReport?.episodeNumber !== epn ||
      pipelineReport.validatedImageCount === pipelineReport.totalScenes)
  const sceneImagesPartial = coverage.withImage > 0 && coverage.missing.length > 0
  const charactersGenerated = Boolean(
    project?.bible?.characters?.some((c) => Boolean(c.baseImageUrl)) ||
      (project?.characterIdentityMemory?.length ?? 0) > 0 ||
      (project?.assets ?? []).some((a) => a.kind === 'character' && a.url)
  )
  const ep = project?.episodes.find((e) => e.number === epn) ?? project?.episodes[0]
  const narrationGenerated =
    Boolean(ep?.narrationAudioUrl) &&
    (pipelineReport?.episodeNumber !== epn || pipelineReport.narrationState === 'audio_ready')
  const assetsReviewed = Boolean(
    project?.scriptReviewReady &&
      !project?.storyboardPartial &&
      (validatedReady || !pipelineReport)
  )
  const validationPassed =
    validatedReady ||
    (sceneImagesGenerated && narrationGenerated && Boolean(project?.sceneImagesComplete))
  const videoReady = Boolean(project?.lastRenderVideoUrl)

  const canRenderFinalVideo =
    storyGenerated && sceneImagesGenerated && narrationGenerated && validationPassed && !videoReady

  return {
    storyGenerated,
    sceneImagesGenerated,
    charactersGenerated,
    assetsReviewed,
    videoReady,
    coverage,
    canRenderFinalVideo,
    sceneImagesPartial,
    narrationGenerated,
    validationPassed
  }
}

export function sceneImageStateForIndex(
  project: ProjectState | null,
  sceneIndex: number,
  busyGenerating?: boolean
): 'pending' | 'queued' | 'generating' | 'completed' | 'failed' {
  const fromValidation = sceneImageStateFromValidation(project, sceneIndex)
  if (fromValidation) return fromValidation
  const url = sceneUrlForIndex(project, sceneIndex)
  if (url) return 'completed'
  if (busyGenerating) return 'generating'
  const ep = project?.episodes.find((e) => e.scenes.some((s) => s.index === sceneIndex))
  const sc = ep?.scenes.find((s) => s.index === sceneIndex)
  if (sc?.generationStatus === 'image_failed') return 'failed'
  if (sc?.productionStatus === 'generating_visuals') return 'generating'
  if (sc?.productionStatus === 'queued') return busyGenerating ? 'generating' : 'queued'
  if (busyGenerating) return 'queued'
  return 'pending'
}
