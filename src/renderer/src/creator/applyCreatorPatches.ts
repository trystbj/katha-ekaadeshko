import type { StoryEpisode } from '../types/story'
import type { CopilotScenePatch, SceneCreatorOverride } from '../types/creatorStudio'

/** Apply co-pilot patches to episode cinematic plan (non-destructive copy). */
export function applyCopilotPatchesToEpisode(
  episode: StoryEpisode,
  patches: CopilotScenePatch[]
): StoryEpisode {
  const plan = episode.cinematicDirectorPlan
  if (!plan || !Array.isArray(plan.scenes)) return episode
  const scenes = [...plan.scenes]
  for (const p of patches) {
    const ix = p.sceneIndex - 1
    if (ix < 0 || ix >= scenes.length) continue
    const sc = { ...scenes[ix] } as Record<string, unknown>
    if (p.domain === 'pacing' && sc.pacing) {
      const pacing = { ...(sc.pacing as object) }
      if (typeof p.delta.pacingMul === 'number') {
        ;(pacing as { beatWeight?: number }).beatWeight = Math.min(
          1,
          ((pacing as { beatWeight?: number }).beatWeight ?? 0.5) * p.delta.pacingMul
        )
      }
      sc.pacing = pacing
    }
    if (p.domain === 'camera' && sc.camera) {
      const camera = { ...(sc.camera as object) }
      if (typeof p.delta.cameraIntensityMul === 'number') {
        ;(camera as { breathing?: number }).breathing = Math.min(
          1,
          ((camera as { breathing?: number }).breathing ?? 0.2) * p.delta.cameraIntensityMul
        )
      }
      sc.camera = camera
    }
    if (p.domain === 'music' && sc.music) {
      const music = { ...(sc.music as object) }
      if (typeof p.delta.musicIntensityMul === 'number') {
        ;(music as { intensity?: number }).intensity = Math.min(
          1,
          ((music as { intensity?: number }).intensity ?? 0.5) * p.delta.musicIntensityMul
        )
      }
      sc.music = music
    }
    if (p.domain === 'subtitles' && sc.subtitle) {
      const subtitle = { ...(sc.subtitle as object) }
      if (typeof p.delta.subtitleLeadInMs === 'number') {
        ;(subtitle as { leadInMs?: number }).leadInMs = Math.max(
          0,
          ((subtitle as { leadInMs?: number }).leadInMs ?? 0) + p.delta.subtitleLeadInMs
        )
      }
      sc.subtitle = subtitle
    }
    scenes[ix] = sc
  }
  return {
    ...episode,
    cinematicDirectorPlan: { ...plan, scenes }
  }
}

export function mergeSceneOverride(
  episode: StoryEpisode,
  override: SceneCreatorOverride
): StoryEpisode {
  const delta: Record<string, number | string | boolean> = {}
  if (override.pacingMul != null) delta.pacingMul = override.pacingMul
  if (override.cameraIntensityMul != null) delta.cameraIntensityMul = override.cameraIntensityMul
  if (override.musicIntensityMul != null) delta.musicIntensityMul = override.musicIntensityMul
  return applyCopilotPatchesToEpisode(episode, [
    {
      sceneIndex: override.sceneIndex,
      domain: 'intensity',
      delta,
      summary: override.notes || 'Manual override'
    }
  ])
}
