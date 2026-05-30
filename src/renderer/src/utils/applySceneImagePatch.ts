import type { ProjectState } from '../types/story'
import {
  buildSceneAssetsFromPipeline,
  mergeProjectAssets,
  sceneIndexFromPipelineRow,
  sceneUrlForIndex
} from './sceneAssetMap'
import type { SceneProductionStatus } from '../types/story'

type SceneImageRow = {
  scene?: string | number
  image_url?: string
  imageUrl?: string
  prompt?: string
  leonardoSeed?: number
  leonardoImageId?: string
  leonardoGenerationId?: string
}

/** Merge one Leonardo scene still into project state (live storyboard updates). */
export function applySceneImagePatch(
  project: ProjectState,
  episodeNumber: number,
  imageRow: SceneImageRow,
  fallbackIndex = 1
): ProjectState {
  const sceneNum = sceneIndexFromPipelineRow(imageRow, fallbackIndex)
  const url = imageRow.image_url || imageRow.imageUrl
  const existingUrl = sceneUrlForIndex(project, sceneNum)
  if (url && existingUrl === url) return project
  const assetsFromPipeline = buildSceneAssetsFromPipeline([imageRow])
  const mergedAssets = mergeProjectAssets(project.assets, assetsFromPipeline)
  return {
    ...project,
    assets: mergedAssets,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              s.index === sceneNum
                ? {
                    ...s,
                    productionStatus: (url ? 'visual_ready' : 'awaiting_review') as SceneProductionStatus,
                    generationStatus: url ? 'image' : 'image_failed'
                  }
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
              s.index === sceneIndex ? { ...s, productionStatus: 'generating_visuals' } : s
            )
          }
        : e
    ),
    updatedAt: new Date().toISOString()
  }
}
