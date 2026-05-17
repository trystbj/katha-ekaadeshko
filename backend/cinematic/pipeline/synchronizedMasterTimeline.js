/**
 * Master timeline orchestrator v2 — cumulative scene boundaries + transitions.
 */

/**
 * @param {Array<object>} enrichedScenes director plan scenes
 * @param {Array<object>} transitions transition cues
 * @param {number} fallbackSecondsPerScene
 */
export function buildSynchronizedMasterTimeline(enrichedScenes, transitions, fallbackSecondsPerScene = 4) {
  const scenes = Array.isArray(enrichedScenes) ? enrichedScenes : []
  const n = scenes.length
  const baseMs = Math.round(fallbackSecondsPerScene * 1000)
  const transitionByTo = new Map()
  for (const t of transitions || []) {
    transitionByTo.set(t.toIndex, t)
  }

  const sceneBoundaries = []
  let wall = 0

  for (let i = 0; i < n; i++) {
    const trans = transitionByTo.get(i)
    if (trans?.durationMs) wall += trans.durationMs

    const sc = scenes[i]
    const durationMs =
      typeof sc?.timeline?.durationMs === 'number' && sc.timeline.durationMs > 0
        ? Math.round(sc.timeline.durationMs)
        : baseMs

    const startMs = wall
    wall += durationMs
    sceneBoundaries.push({
      sceneIndex: sc?.sceneIndex ?? i + 1,
      startMs,
      endMs: wall,
      durationMs
    })
  }

  const secondsPerScene =
    n > 0 ? sceneBoundaries.reduce((s, b) => s + b.durationMs, 0) / n / 1000 : fallbackSecondsPerScene

  return {
    syncVersion: 2,
    secondsPerScene: Math.round(secondsPerScene * 100) / 100,
    sceneCount: n,
    totalDurationMs: wall,
    sceneBoundaries,
    transitions: transitions || []
  }
}

/**
 * Rebuild per-scene timeline.layers using synchronized boundaries.
 * @param {Array<object>} scenes mutable scene plans
 * @param {object} masterTimeline
 */
export function applySynchronizedTimelineToScenes(scenes, masterTimeline) {
  if (!masterTimeline?.sceneBoundaries?.length) return scenes
  for (let i = 0; i < scenes.length; i++) {
    const boundary = masterTimeline.sceneBoundaries[i]
    if (!boundary) continue
    const sc = scenes[i]
    const durationMs = boundary.durationMs
    const leadIn = sc.subtitle?.leadInMs ?? 0
    const pauseAfter = sc.pacing?.pauseAfterMs ?? 0
    const musicSilence = sc.music?.silenceBeforeMs ?? 0
    const reactionDelay = sc.acting?.reactionDelayMs ?? 0
    const narrStart = leadIn + musicSilence
    const narrEnd = durationMs - Math.min(pauseAfter, durationMs * 0.25)
    const subStart = narrStart + Math.round(reactionDelay * 0.3)

    sc.timeline = {
      sceneIndex: sc.sceneIndex ?? i + 1,
      durationMs,
      layers: {
        narration: { startMs: narrStart, endMs: narrEnd },
        subtitles: { startMs: subStart, endMs: narrEnd },
        music: {
          startMs: 0,
          endMs: durationMs,
          theme: sc.music?.theme ?? 'neutral'
        },
        ambience: { startMs: 0, endMs: durationMs },
        sfx: { startMs: Math.round(durationMs * 0.12), endMs: durationMs },
        camera: { startMs: 0, endMs: durationMs },
        expression: { startMs: reactionDelay, endMs: durationMs },
        vfx: { startMs: 0, endMs: durationMs },
        transition: {
          startMs: 0,
          endMs: masterTimeline.transitions?.find((t) => t.toIndex === i)?.durationMs ?? 0
        }
      }
    }
  }
  return scenes
}
