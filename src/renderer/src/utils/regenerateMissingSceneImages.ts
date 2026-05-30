import { fetchRegenerationPlan } from '../creator/creatorApi'
import type { ProjectState, StoryEpisode } from '../types/story'
import { buildSceneAssetsFromPipeline, mergeProjectAssets } from './sceneAssetMap'
import { episodeSceneImageCoverage, withStoryboardReady } from './storyboardWorkflow'

function studioInputFromProject(project: ProjectState) {
  const bible = project.bible
  return {
    aspectMode: bible?.aspectMode ?? 'vertical_9_16',
    styleId: bible?.styleId,
    customVisualPrompt: bible?.customVisualPrompt,
    genre: '',
    theme: bible?.concept ?? '',
    narratorId: bible?.narratorId,
    characters: (bible?.characters ?? []).map((c) => ({
      name: c.name,
      role: c.role || c.personality,
      traits: c.visualIdentity || c.appearance || c.baseImagePrompt,
      visualIdentity: c.visualIdentity,
      baseImagePrompt: c.baseImagePrompt,
      referenceImages: c.referenceImages
    })),
    characterReference: project.characterReference
  }
}

/** Regenerate Leonardo stills for scenes missing assets (client-side after partial pipeline). */
export async function regenerateMissingSceneImages(
  project: ProjectState,
  episodeNumber: number,
  opts?: {
    onScene?: (sceneIndex: number, ok: boolean) => void
    onProjectPatch?: (project: ProjectState) => void
  }
): Promise<ProjectState> {
  const ep = project.episodes.find((e) => e.number === episodeNumber)
  if (!ep) return project
  const { missing } = episodeSceneImageCoverage(project, episodeNumber)
  if (!missing.length) return withStoryboardReady(project, { partial: false, missingSceneIndices: [] })

  let next = project
  for (const sceneIndex of missing) {
    const rowIx = ep.scenes.findIndex((s) => s.index === sceneIndex)
    if (rowIx < 0) continue
    try {
      const res = await fetchRegenerationPlan('visuals', sceneIndex, ep as StoryEpisode, {
        execute: true,
        studioInput: studioInputFromProject(next)
      })
      const exec = res.execution as { results?: { slot?: string; imageUrl?: string; status?: string }[] } | undefined
      const hit = exec?.results?.find((r) => r.slot === 'leonardo:scene' && r.imageUrl)
      if (hit?.imageUrl) {
        const assetsFromPipeline = buildSceneAssetsFromPipeline([
          { scene: sceneIndex, image_url: hit.imageUrl, prompt: '' }
        ])
        next = withStoryboardReady(
          {
            ...next,
            assets: mergeProjectAssets(next.assets, assetsFromPipeline),
            updatedAt: new Date().toISOString()
          },
          { partial: true, episodeNumber }
        )
        opts?.onProjectPatch?.(next)
        opts?.onScene?.(sceneIndex, true)
      } else {
        opts?.onScene?.(sceneIndex, false)
      }
    } catch {
      opts?.onScene?.(sceneIndex, false)
    }
  }

  const cov = episodeSceneImageCoverage(next, episodeNumber)
  return withStoryboardReady(next, {
    partial: cov.missing.length > 0,
    missingSceneIndices: cov.missing
  })
}
