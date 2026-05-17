import type { CopilotScenePatch } from '../studio/creatorStudioTypes'

/** Apply live director patches without full pipeline regeneration. */
export function applyLiveDirectorPatches(
  plan: Record<string, unknown>,
  patches: CopilotScenePatch[]
): Record<string, unknown> {
  const scenes = Array.isArray(plan.scenes) ? [...(plan.scenes as Record<string, unknown>[])] : []
  if (!scenes.length) return plan

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
    if (p.domain === 'emotion' && sc.emotion) {
      const emotion = { ...(sc.emotion as object) }
      if (typeof p.delta.emotionIntensityMul === 'number') {
        ;(emotion as { intensity?: number }).intensity = Math.min(
          1,
          ((emotion as { intensity?: number }).intensity ?? 0.5) * p.delta.emotionIntensityMul
        )
      }
      sc.emotion = emotion
    }

    scenes[ix] = sc
  }

  return {
    ...plan,
    scenes,
    liveDirectorRevision: (typeof plan.liveDirectorRevision === 'number' ? plan.liveDirectorRevision : 0) + 1
  }
}
