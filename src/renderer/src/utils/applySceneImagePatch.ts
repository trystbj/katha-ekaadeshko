import type { ProjectState } from '../types/story'
import {
  buildSceneAssetsFromPipeline,
  mergeProjectAssets,
  sceneIndexFromPipelineRow,
  sceneUrlForIndex
} from './sceneAssetMap'
import type { SceneProductionStatus } from '../types/story'
import { patchSceneImageStatusFields } from './sceneImageStatus'

type SceneImageRow = {
  scene?: string | number
  image_url?: string
  imageUrl?: string
  prompt?: string
  leonardoSeed?: number
  leonardoImageId?: string
  leonardoGenerationId?: string
  status?: string
  error?: string
}

/** Merge one Leonardo scene still into project state (live storyboard updates). */
export function applySceneImagePatch(
  project: ProjectState,
  episodeNumber: number,
  imageRow: SceneImageRow,
  fallbackIndex = 1
): ProjectState {
  const sceneNum = sceneIndexFromPipelineRow(imageRow, fallbackIndex)
  const url = String(imageRow.image_url || imageRow.imageUrl || '').trim()
  const existingUrl = sceneUrlForIndex(project, sceneNum)
  if (url && existingUrl === url) return project

  const isPlaceholder = imageRow.status === 'placeholder' || !url
  const assetsFromPipeline = buildSceneAssetsFromPipeline([imageRow])
  const mergedAssets = mergeProjectAssets(project.assets, assetsFromPipeline)
  const now = new Date().toISOString()

  return {
    ...project,
    assets: mergedAssets,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              s.index === sceneNum
                ? patchSceneImageStatusFields(
                    {
                      ...s,
                      productionStatus: (url && !isPlaceholder
                        ? 'visual_ready'
                        : 'awaiting_review') as SceneProductionStatus,
                      generationStatus: isPlaceholder
                        ? 'image_failed'
                        : url
                          ? 'image'
                          : 'image_failed'
                    },
                    {
                      imageStatus: isPlaceholder ? 'failed' : url ? 'generating' : 'failed',
                      imageUrl: url || undefined,
                      imageError: isPlaceholder
                        ? String(imageRow.error || 'Placeholder image')
                        : url
                          ? undefined
                          : 'No image URL returned',
                      lastGenerationAttempt: now
                    }
                  )
                : s
            )
          }
        : e
    ),
    updatedAt: now
  }
}

export function markSceneFailed(
  project: ProjectState,
  episodeNumber: number,
  sceneIndex: number,
  errorMessage?: string
): ProjectState {
  return {
    ...project,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              s.index === sceneIndex
                ? patchSceneImageStatusFields(
                    {
                      ...s,
                      productionStatus: 'awaiting_review',
                      generationStatus: 'image_failed'
                    },
                    {
                      imageStatus: 'failed',
                      imageError: errorMessage || s.imageError || 'Image generation failed'
                    }
                  )
                : s
            )
          }
        : e
    ),
    updatedAt: new Date().toISOString()
  }
}

export function markSceneGenerating(
  project: ProjectState,
  episodeNumber: number,
  sceneIndex: number
): ProjectState {
  return {
    ...project,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              s.index === sceneIndex
                ? patchSceneImageStatusFields(
                    { ...s, productionStatus: 'generating_visuals' },
                    { imageStatus: 'generating', imageError: undefined }
                  )
                : s
            )
          }
        : e
    ),
    updatedAt: new Date().toISOString()
  }
}

export function markSceneImageCompleted(
  project: ProjectState,
  episodeNumber: number,
  sceneIndex: number,
  imageUrl: string
): ProjectState {
  return {
    ...project,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              s.index === sceneIndex
                ? patchSceneImageStatusFields(
                    {
                      ...s,
                      productionStatus: 'visual_ready',
                      generationStatus: 'complete'
                    },
                    {
                      imageStatus: 'completed',
                      imageUrl,
                      imageError: undefined
                    }
                  )
                : s
            )
          }
        : e
    ),
    updatedAt: new Date().toISOString()
  }
}
