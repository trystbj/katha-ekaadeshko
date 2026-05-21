import type { AssetRef, ProjectState, StoryScene } from '../types/story'
import { sceneIndexFromPipelineRow, sceneUrlForIndex } from './sceneAssetMap'

export type SceneGenerationStatus =
  | 'writing'
  | 'image'
  | 'narration'
  | 'motion'
  | 'complete'
  | 'image_failed'

export function sceneGenerationStatusForRow(
  project: ProjectState | null,
  sceneIndex: number,
  hasNarrationAudio?: boolean
): SceneGenerationStatus {
  const url = sceneUrlForIndex(project, sceneIndex)
  if (url) return hasNarrationAudio ? 'complete' : 'narration'
  return 'image_failed'
}

export function attachSceneGenerationStatuses(
  project: ProjectState,
  episodeNumber: number,
  hasEpisodeNarration?: boolean
): StoryScene[] {
  const ep = project.episodes.find((e) => e.number === episodeNumber)
  if (!ep?.scenes?.length) return []
  return ep.scenes.map((s) => ({
    ...s,
    generationStatus: sceneGenerationStatusForRow(project, s.index, hasEpisodeNarration)
  }))
}

export function countEpisodeSceneImages(project: ProjectState | null, episodeScenes: StoryScene[]): number {
  if (!project || !episodeScenes.length) return 0
  return episodeScenes.filter((s) => Boolean(sceneUrlForIndex(project, s.index))).length
}

export function episodeScenesMissingImages(project: ProjectState | null, episodeScenes: StoryScene[]): number[] {
  return episodeScenes.filter((s) => !sceneUrlForIndex(project, s.index)).map((s) => s.index)
}

export function filterAssetsToSceneIndices(assets: AssetRef[], sceneIndices: Set<number>): AssetRef[] {
  const other = assets.filter((a) => a.kind !== 'scene')
  const scenes = assets.filter((a) => {
    if (a.kind !== 'scene') return false
    const n = Number(/^scene:(\d+)$/.exec(String(a.key).trim())?.[1] ?? 0)
    return sceneIndices.has(n)
  })
  return [...other, ...scenes]
}

/** Build episode scene list from pipeline script rows (aligned indices with Leonardo keys). */
export function buildEpisodeScenesFromScriptRows(
  scriptRows: Record<string, unknown>[],
  maxCount: number
): { scenes: StoryScene[]; sceneIndices: Set<number> } {
  const slice = scriptRows.slice(0, maxCount)
  const sceneIndices = new Set<number>()
  const scenes: StoryScene[] = []
  for (let i = 0; i < slice.length; i++) {
    const s = slice[i]
    const sceneNum = sceneIndexFromPipelineRow(s as { scene?: string | number }, i + 1)
    sceneIndices.add(sceneNum)
    const narration = typeof s.narration === 'string' ? s.narration : ''
    const composed =
      typeof s.composed_narration === 'string' && String(s.composed_narration).trim()
        ? String(s.composed_narration).trim()
        : narration
    const dialogueLines = Array.isArray(s.dialogue)
      ? (s.dialogue as { character?: string; line?: string }[])
          .map((d) => ({
            character: String(d?.character || '').trim() || 'Character',
            line: String(d?.line || '').trim()
          }))
          .filter((d) => d.line.length > 0)
      : []
    scenes.push({
      index: sceneNum,
      lineType: 'Dialogue',
      character: 'Narration',
      text: composed || narration,
      narrationText: narration,
      ...(dialogueLines.length ? { dialogueLines } : {}),
      visualDescription:
        typeof s.visual_description === 'string' ? s.visual_description : undefined
    })
  }
  return { scenes, sceneIndices }
}
