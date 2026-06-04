import { buildScenePlaceholderImageUrl } from '@shared/scenePlaceholderImage.js'
import type { ProjectState, StoryScene } from '../types/story'
import { buildSceneAssetsFromPipeline } from './sceneAssetMap'
import type { AssetRef } from '../types/story'

/** Emergency still when Leonardo retries fail — never leave scene without a renderable URL. */
export function buildEmergencySceneImageUrl(
  scene: StoryScene,
  project: ProjectState
): string {
  const title = scene.sceneTitle || `Scene ${scene.index}`
  const desc = String(scene.visualDescription || scene.narrationText || scene.text || '')
    .replace(/[<>"&]/g, '')
    .slice(0, 120)
  const style =
    project.bible?.styleId === 'custom'
      ? String(project.bible?.customVisualPrompt || 'custom').slice(0, 40)
      : String(project.bible?.styleId || 'cinematic').replace(/_/g, ' ')
  const hint = desc || style || 'Story scene'
  return buildScenePlaceholderImageUrl(scene.index, `${title} · ${hint}`)
}

export function emergencySceneAssetsForIndices(
  project: ProjectState,
  episodeNumber: number,
  sceneIndices: number[]
): AssetRef[] {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  if (!ep) return []
  const rows = sceneIndices
    .map((ix) => ep.scenes.find((s) => s.index === ix))
    .filter(Boolean)
    .map((sc) => ({
      scene: sc!.index,
      image_url: buildEmergencySceneImageUrl(sc!, project),
      status: 'emergency_fallback',
      prompt: String(sc!.visualDescription || '').slice(0, 400)
    }))
  return buildSceneAssetsFromPipeline(rows)
}
