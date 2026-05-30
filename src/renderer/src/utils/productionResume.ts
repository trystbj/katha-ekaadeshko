import type { ProjectState } from '../types/story'
import { deriveCinematicProductionGate } from './cinematicProductionGate'
import { episodeSceneImageCoverage } from './storyboardWorkflow'

export type ProductionResumeKind =
  | 'review_script'
  | 'generate_scene_images'
  | 'finish_scene_images'
  | 'create_final_video'
  | 'watch_export'

export type ProductionResume = {
  kind: ProductionResumeKind
  episodeNumber: number
  coverage: ReturnType<typeof episodeSceneImageCoverage>
  labelKey: string
  hintKey: string
}

/** Next recommended step when reopening a saved in-progress project. */
export function deriveProductionResume(
  project: ProjectState | null | undefined,
  episodeNumber?: number
): ProductionResume | null {
  if (!project?.bible) return null
  const epn =
    episodeNumber ??
    project.episodes.find((e) => e.scenes?.length)?.number ??
    project.episodes[0]?.number ??
    1
  const coverage = episodeSceneImageCoverage(project, epn)
  if (!coverage.total) return null

  const gate = deriveCinematicProductionGate(project, epn)

  if (project.lastRenderVideoUrl) {
    return {
      kind: 'watch_export',
      episodeNumber: epn,
      coverage,
      labelKey: 'productionResumeWatchExport',
      hintKey: 'productionResumeHintWatchExport'
    }
  }

  if (gate.sceneImagesGenerated) {
    return {
      kind: 'create_final_video',
      episodeNumber: epn,
      coverage,
      labelKey: 'productionResumeFinalVideo',
      hintKey: 'productionResumeHintFinalVideo'
    }
  }

  if (coverage.withImage > 0 && coverage.missing.length > 0) {
    return {
      kind: 'finish_scene_images',
      episodeNumber: epn,
      coverage,
      labelKey: 'productionResumeFinishImages',
      hintKey: 'productionResumeHintFinishImages'
    }
  }

  if (coverage.withImage === 0) {
    const reviewFirst = project.scriptReviewReady && !project.assetsGenerationApproved
    return {
      kind: reviewFirst ? 'review_script' : 'generate_scene_images',
      episodeNumber: epn,
      coverage,
      labelKey: reviewFirst ? 'productionResumeReviewScript' : 'productionResumeGenerateImages',
      hintKey: reviewFirst ? 'productionResumeHintReviewScript' : 'productionResumeHintGenerateImages'
    }
  }

  return {
    kind: 'generate_scene_images',
    episodeNumber: epn,
    coverage,
    labelKey: 'productionResumeGenerateImages',
    hintKey: 'productionResumeHintGenerateImages'
  }
}
