/** Playback timeline — shared between pipeline plans and renderer sync. */

export interface SceneBoundary {
  sceneIndex: number
  startMs: number
  endMs: number
}

export interface PlaybackTimeline {
  secondsPerScene: number
  totalDurationMs: number
  boundaries: SceneBoundary[]
  /** Per-scene subtitle lead-in from director plan (ms). */
  leadInMsByScene: number[]
  /** Per-scene duration from director plan (ms). */
  durationMsByScene: number[]
}

export interface PerSceneTimingOverride {
  durationMs: number
  subtitleLeadInMs: number
}
