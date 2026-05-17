import type { PlaybackTimeline } from '../engines/timeline/types'
import { resolvePlaybackTimeline } from '../engines/timeline/resolvePlaybackTimeline'

export interface RealtimeTimelineSnapshot {
  revision: number
  timeline: PlaybackTimeline
  computedAt: string
}

/** Recompute playback timeline for live preview (orchestration-aware). */
export function buildRealtimeTimelineSnapshot(
  plan: Record<string, unknown> | null | undefined,
  sceneCount: number,
  fallbackSecondsPerScene: number,
  revision: number,
  videoDurationSec?: number
): RealtimeTimelineSnapshot {
  let timeline = resolvePlaybackTimeline(plan, sceneCount, fallbackSecondsPerScene)

  if (
    videoDurationSec != null &&
    videoDurationSec > 0 &&
    timeline.totalDurationMs > 0 &&
    sceneCount > 0
  ) {
    const videoMs = videoDurationSec * 1000
    const ratio = videoMs / timeline.totalDurationMs
    if (ratio > 0.85 && ratio < 1.18) {
      timeline = {
        ...timeline,
        totalDurationMs: videoMs,
        boundaries: timeline.boundaries.map((b) => ({
          ...b,
          startMs: b.startMs * ratio,
          endMs: b.endMs * ratio
        })),
        durationMsByScene: timeline.durationMsByScene.map((d) => d * ratio)
      }
    }
  }

  return {
    revision,
    timeline,
    computedAt: new Date().toISOString()
  }
}
