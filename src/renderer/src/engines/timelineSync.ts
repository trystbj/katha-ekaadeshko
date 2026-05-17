/**
 * Renderer timeline sync — uses core playback resolver + cinematic plan on episodes.
 */

import type { PerSceneTimingOverride, PlaybackTimeline } from '../../../../core/engines/timeline/types'
import {
  effectiveSecondsPerScene,
  perSceneTimingOverrides,
  resolvePlaybackTimeline,
  sceneIndexAtTime,
  seekSecondsForScene
} from '../../../../core/engines/timeline/resolvePlaybackTimeline'
import { SECONDS_PER_RENDER_SCENE } from '../utils/scenesWebVtt'

export type { PlaybackTimeline, PerSceneTimingOverride }

export function buildPlaybackTimeline(
  cinematicPlan: Record<string, unknown> | null | undefined,
  sceneCount: number,
  videoDurationSec?: number
): PlaybackTimeline {
  const timeline = resolvePlaybackTimeline(
    cinematicPlan,
    sceneCount,
    SECONDS_PER_RENDER_SCENE
  )
  if (
    videoDurationSec != null &&
    videoDurationSec > 0 &&
    timeline.totalDurationMs > 0 &&
    sceneCount > 0
  ) {
    const videoMs = videoDurationSec * 1000
    const ratio = videoMs / timeline.totalDurationMs
    if (ratio > 0.85 && ratio < 1.18) {
      return {
        ...timeline,
        totalDurationMs: videoMs,
        boundaries: timeline.boundaries.map((b) => ({
          ...b,
          startMs: Math.round(b.startMs * ratio),
          endMs: Math.round(b.endMs * ratio)
        })),
        durationMsByScene: timeline.durationMsByScene.map((d) => Math.round(d * ratio))
      }
    }
  }
  return timeline
}

export function sceneIndexForPlayback(
  timeline: PlaybackTimeline,
  currentTimeSec: number
): number {
  return sceneIndexAtTime(timeline, currentTimeSec)
}

export function seekTimeForSceneIndex(timeline: PlaybackTimeline, sceneIndex: number): number {
  return seekSecondsForScene(timeline, sceneIndex)
}

export function secondsPerSceneFromPlan(
  cinematicPlan: Record<string, unknown> | null | undefined
): number {
  return effectiveSecondsPerScene(cinematicPlan, SECONDS_PER_RENDER_SCENE)
}

export function timingOverridesFromPlan(
  cinematicPlan: Record<string, unknown> | null | undefined,
  sceneCount: number
): PerSceneTimingOverride[] | undefined {
  if (!cinematicPlan || sceneCount < 1) return undefined
  const timeline = resolvePlaybackTimeline(cinematicPlan, sceneCount, SECONDS_PER_RENDER_SCENE)
  if (!timeline.boundaries.length) return undefined
  return perSceneTimingOverrides(timeline)
}
