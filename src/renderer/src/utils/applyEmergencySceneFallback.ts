import type { ProjectState } from '../types/story'
import { buildEmergencySceneImageUrl, emergencySceneAssetsForIndices } from './sceneEmergencyFallback'
import { mergeProjectAssets } from './sceneAssetMap'
import { getFailedSceneIndices, patchSceneImageStatusFields, sceneImageUrlForScene, syncEpisodeSceneImageStatuses } from './sceneImageStatus'
import { isPlaceholderSceneUrl } from './sceneImageValidationClient'
import { applySceneImagePatch } from './applySceneImagePatch'

/** After retries exhaust, fill failed scenes with readable SVG fallbacks (not black). */
export function applyEmergencyFallbackForFailedScenes(
  project: ProjectState,
  episodeNumber: number,
  sceneIndices?: number[]
): ProjectState {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  if (!ep) return project

  const failed = (sceneIndices?.length
    ? sceneIndices.filter((ix) => getFailedSceneIndices(project, episodeNumber).includes(ix))
    : getFailedSceneIndices(project, episodeNumber)
  ).filter((ix) => {
    const sc = ep.scenes.find((s) => s.index === ix)
    if (!sc) return false
    const url = sceneImageUrlForScene(project, sc)
    return !url || isPlaceholderSceneUrl(String(url))
  })

  if (!failed.length) return project

  console.info('[katha:scene-image]', 'emergency_fallback_apply', {
    episode: episodeNumber,
    scenes: failed
  })

  const assets = emergencySceneAssetsForIndices(project, episodeNumber, failed)
  let next: ProjectState = {
    ...project,
    assets: mergeProjectAssets(project.assets, assets),
    updatedAt: new Date().toISOString()
  }

  for (const ix of failed) {
    const sc = ep.scenes.find((s) => s.index === ix)
    if (!sc) continue
    const url = buildEmergencySceneImageUrl(sc, project)
    next = applySceneImagePatch(next, episodeNumber, {
      scene: ix,
      image_url: url,
      status: 'emergency_fallback',
      error: sc.imageError || 'Image generation failed — showing fallback artwork'
    })
    console.info('[katha:scene-image]', 'emergency_fallback_saved', { scene: ix, url: url.slice(0, 80) })
  }

  return syncEpisodeSceneImageStatuses(next, episodeNumber)
}
