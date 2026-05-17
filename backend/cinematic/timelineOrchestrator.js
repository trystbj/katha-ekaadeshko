/**
 * Multi-layer synchronized timeline per scene.
 */

const DEFAULT_SCENE_MS = 4000

/**
 * @param {object} scenePlan enriched scene plan
 * @param {number} [secondsPerScene]
 */
export function buildSceneTimelineLayers(scenePlan, secondsPerScene = 4) {
  const durationMs = Math.round(secondsPerScene * 1000)
  const ix = scenePlan.sceneIndex ?? 1
  const leadIn = scenePlan.subtitle?.leadInMs ?? 0
  const pauseAfter = scenePlan.pacing?.pauseAfterMs ?? 0
  const musicSilence = scenePlan.music?.silenceBeforeMs ?? 0
  const reactionDelay = scenePlan.acting?.reactionDelayMs ?? 0

  const narrStart = leadIn + musicSilence
  const narrEnd = durationMs - Math.min(pauseAfter, durationMs * 0.25)
  const subStart = narrStart + Math.round(reactionDelay * 0.3)
  const subEnd = narrEnd

  return {
    sceneIndex: ix,
    durationMs,
    layers: {
      narration: { startMs: narrStart, endMs: narrEnd },
      subtitles: { startMs: subStart, endMs: subEnd },
      music: {
        startMs: musicSilence > 0 ? 0 : 0,
        endMs: durationMs,
        theme: scenePlan.music?.theme ?? 'neutral'
      },
      ambience: { startMs: 0, endMs: durationMs },
      sfx: { startMs: Math.round(durationMs * 0.12), endMs: durationMs },
      camera: { startMs: 0, endMs: durationMs },
      expression: { startMs: reactionDelay, endMs: durationMs },
      vfx: { startMs: 0, endMs: durationMs }
    }
  }
}

/**
 * @param {Array<object>} scenes
 * @param {number} secondsPerScene
 */
export function buildMasterTimeline(scenes, secondsPerScene = 4) {
  const sceneMs = Math.round(secondsPerScene * 1000) || DEFAULT_SCENE_MS
  return {
    syncVersion: 1,
    secondsPerScene,
    sceneCount: scenes.length,
    totalDurationMs: scenes.length * sceneMs
  }
}
