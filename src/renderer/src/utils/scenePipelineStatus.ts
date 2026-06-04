import type { AssetRef, ProjectState, StoryScene } from '../types/story'
import { sceneIndexFromPipelineRow, sceneUrlForIndex } from './sceneAssetMap'
import { isEmergencySceneAsset, sceneAssetForIndex } from './pipelineCompletionAudit'

function strField(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function sceneTitleFromRow(row: Record<string, unknown>, sceneNum: number): string {
  return (
    strField(row, 'scene_title', 'title') ||
    `Scene ${sceneNum}`
  )
}

export type SceneGenerationStatus =
  | 'writing'
  | 'image'
  | 'narration'
  | 'motion'
  | 'complete'
  | 'image_failed'

export function sceneImageStateFromValidation(
  project: ProjectState | null,
  sceneIndex: number
): 'completed' | 'failed' | null {
  const report = project?.pipelineValidationReport
  if (!report) return null
  const row = report.scenes.find((s) => s.scene === sceneIndex)
  if (!row) return null
  if (row.image === 'ok' && row.preview === 'ok') return 'completed'
  if (row.image !== 'missing') return 'failed'
  return 'failed'
}

export function sceneGenerationStatusForRow(
  project: ProjectState | null,
  sceneIndex: number,
  hasNarrationAudio?: boolean
): SceneGenerationStatus {
  const asset = sceneAssetForIndex(project, sceneIndex)
  if (isEmergencySceneAsset(asset)) return 'image_failed'
  const validated = sceneImageStateFromValidation(project, sceneIndex)
  if (validated === 'failed') return 'image_failed'
  const url = sceneUrlForIndex(project, sceneIndex)
  if (url && validated !== 'failed') return hasNarrationAudio ? 'complete' : 'narration'
  if (!url) return 'image_failed'
  return hasNarrationAudio ? 'complete' : 'narration'
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
  const seenSceneNum = new Set<number>()
  for (let i = 0; i < slice.length; i++) {
    const s = slice[i]
    const sceneNum = sceneIndexFromPipelineRow(s as { scene?: string | number }, i + 1)
    if (seenSceneNum.has(sceneNum)) continue
    seenSceneNum.add(sceneNum)
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
    const row = s as Record<string, unknown>
    scenes.push({
      index: sceneNum,
      lineType: 'Dialogue',
      character: 'Narration',
      text: composed || narration,
      narrationText: narration,
      ...(dialogueLines.length ? { dialogueLines } : {}),
      visualDescription: strField(row, 'visual_description'),
      sceneTitle: sceneTitleFromRow(row, sceneNum),
      emotionalTone: strField(row, 'mood', 'emotional_tone', 'tone'),
      cameraDirection: strField(row, 'camera', 'camera_angle', 'camera_direction'),
      environment: strField(row, 'environment', 'location', 'setting'),
      characterActions: strField(row, 'action', 'character_actions', 'actions'),
      productionStatus: 'awaiting_review'
    })
  }
  return { scenes, sceneIndices }
}
