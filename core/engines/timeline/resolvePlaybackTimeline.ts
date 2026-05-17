/**
 * Resolves synchronized playback boundaries from cinematic director plan metadata.
 * Provider-agnostic: accepts plain JSON plan objects from pipeline or episodes.
 */

import type { PerSceneTimingOverride, PlaybackTimeline, SceneBoundary } from './types'

const DEFAULT_SCENE_SEC = 4

type PlanScene = {
  sceneIndex?: number
  subtitle?: { leadInMs?: number }
  timeline?: {
    durationMs?: number
    layers?: {
      subtitles?: { startMs?: number }
      narration?: { startMs?: number }
    }
  }
}

type OrchestrationTimeline = {
  masterTimeline?: {
    secondsPerScene?: number
    sceneBoundaries?: Array<{ sceneIndex: number; startMs: number; endMs: number; durationMs: number }>
    totalDurationMs?: number
  }
}

type DirectorPlan = {
  masterTimeline?: { secondsPerScene?: number; syncVersion?: number; totalDurationMs?: number }
  orchestration?: OrchestrationTimeline
  scenes?: PlanScene[]
}

/**
 * @param plan cinematicDirectorPlan (v2–v4)
 * @param sceneCount number of story scenes
 * @param fallbackSecondsPerScene default slideshow step
 */
export function resolvePlaybackTimeline(
  plan: DirectorPlan | Record<string, unknown> | null | undefined,
  sceneCount: number,
  fallbackSecondsPerScene = DEFAULT_SCENE_SEC
): PlaybackTimeline {
  const n = Math.max(0, sceneCount)
  const p = (plan || {}) as DirectorPlan
  const orchBoundaries = p.orchestration?.masterTimeline?.sceneBoundaries
  if (Array.isArray(orchBoundaries) && orchBoundaries.length >= n && n > 0) {
    const leadInMsByScene: number[] = []
    const durationMsByScene: number[] = []
    const boundaries: SceneBoundary[] = orchBoundaries.slice(0, n).map((b, i) => {
      const sc = (Array.isArray(p.scenes) ? p.scenes[i] : null) as PlanScene | undefined
      let leadIn = 0
      if (typeof sc?.subtitle?.leadInMs === 'number') leadIn = Math.max(0, Math.round(sc.subtitle.leadInMs))
      leadInMsByScene.push(leadIn)
      durationMsByScene.push(b.durationMs)
      return { sceneIndex: b.sceneIndex ?? i, startMs: b.startMs, endMs: b.endMs }
    })
    return {
      secondsPerScene: p.orchestration?.masterTimeline?.secondsPerScene ?? p.masterTimeline?.secondsPerScene ?? fallbackSecondsPerScene,
      totalDurationMs: p.orchestration?.masterTimeline?.totalDurationMs ?? boundaries[boundaries.length - 1]?.endMs ?? n * fallbackSecondsPerScene * 1000,
      boundaries,
      leadInMsByScene,
      durationMsByScene
    }
  }

  const secondsPerScene = p.masterTimeline?.secondsPerScene ?? fallbackSecondsPerScene
  const baseMs = Math.max(1000, Math.round(secondsPerScene * 1000))
  const planScenes = Array.isArray(p.scenes) ? p.scenes : []

  const boundaries: SceneBoundary[] = []
  const leadInMsByScene: number[] = []
  const durationMsByScene: number[] = []
  let wall = 0

  for (let i = 0; i < n; i++) {
    const sc = planScenes[i]
    const durationMs =
      typeof sc?.timeline?.durationMs === 'number' && sc.timeline.durationMs > 0
        ? Math.round(sc.timeline.durationMs)
        : baseMs

    let leadIn = 0
    if (typeof sc?.subtitle?.leadInMs === 'number') {
      leadIn = Math.max(0, Math.round(sc.subtitle.leadInMs))
    } else if (sc?.timeline?.layers?.subtitles && sc.timeline.layers.narration) {
      const subStart = sc.timeline.layers.subtitles.startMs ?? 0
      const narrStart = sc.timeline.layers.narration.startMs ?? 0
      leadIn = Math.max(0, Math.round(subStart - narrStart))
    }

    boundaries.push({ sceneIndex: i, startMs: wall, endMs: wall + durationMs })
    leadInMsByScene.push(leadIn)
    durationMsByScene.push(durationMs)
    wall += durationMs
  }

  return {
    secondsPerScene,
    totalDurationMs: wall || n * baseMs,
    boundaries,
    leadInMsByScene,
    durationMsByScene
  }
}

export function perSceneTimingOverrides(timeline: PlaybackTimeline): PerSceneTimingOverride[] {
  return timeline.durationMsByScene.map((durationMs, i) => ({
    durationMs,
    subtitleLeadInMs: timeline.leadInMsByScene[i] ?? 0
  }))
}

/** Scene index for current playback time (seconds). */
export function sceneIndexAtTime(timeline: PlaybackTimeline, currentTimeSec: number): number {
  if (!timeline.boundaries.length) return 0
  const ms = Math.max(0, currentTimeSec) * 1000
  for (let i = timeline.boundaries.length - 1; i >= 0; i--) {
    const b = timeline.boundaries[i]
    if (ms >= b.startMs) return b.sceneIndex
  }
  return 0
}

/** Seek target (seconds) for scene chapter navigation. */
export function seekSecondsForScene(timeline: PlaybackTimeline, sceneIndex: number): number {
  const b = timeline.boundaries.find((x) => x.sceneIndex === sceneIndex)
  return b ? b.startMs / 1000 : 0
}

/** Effective seconds-per-scene for WebVTT when plan absent. */
export function effectiveSecondsPerScene(
  plan: DirectorPlan | Record<string, unknown> | null | undefined,
  fallback = DEFAULT_SCENE_SEC
): number {
  const p = (plan || {}) as DirectorPlan
  return p.masterTimeline?.secondsPerScene ?? fallback
}
