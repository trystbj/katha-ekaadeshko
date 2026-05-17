/**
 * Render assembly — modular payload for worker / export (provider-agnostic slots).
 */

/**
 * @param {object} params
 */
export function buildRenderAssemblyPlan(params) {
  const {
    cinematicDirectorPlan,
    script,
    storyAudioPlan,
    sceneUnits,
    masterTimeline,
    transitions
  } = params

  const scenes = cinematicDirectorPlan?.scenes || []
  const n = scenes.length
  const boundaries = masterTimeline?.sceneBoundaries || []
  const rows = Array.isArray(script) ? script : []
  const transitionIn = new Map()
  for (const t of transitions || []) {
    transitionIn.set(t.toIndex, t.style)
  }

  const assemblyScenes = []
  for (let i = 0; i < n; i++) {
    const b = boundaries[i] || {
      startMs: i * (masterTimeline?.secondsPerScene ?? 4) * 1000,
      endMs: (i + 1) * (masterTimeline?.secondsPerScene ?? 4) * 1000,
      durationMs: (masterTimeline?.secondsPerScene ?? 4) * 1000
    }
    const sc = scenes[i]
    const layers = sc?.timeline?.layers
    assemblyScenes.push({
      sceneIndex: sc?.sceneIndex ?? i + 1,
      startMs: b.startMs,
      endMs: b.endMs,
      imageSlot: i,
      narrationSlot: i,
      subtitleWindow: layers?.subtitles
        ? { startMs: layers.subtitles.startMs, endMs: layers.subtitles.endMs }
        : { startMs: 0, endMs: b.durationMs },
      transitionIn: transitionIn.get(i) ?? null,
      beatType: sceneUnits?.[i]?.beatType ?? 'general'
    })
  }

  return {
    architectureVersion: 1,
    sceneCount: n,
    totalDurationMs: masterTimeline?.totalDurationMs ?? n * 4000,
    secondsPerScene: masterTimeline?.secondsPerScene ?? 4,
    providerSlots: {
      narration: 'tts:default',
      images: 'leonardo:default',
      audioMix: 'storyAudioPlan',
      render: 'worker:ffmpeg'
    },
    scenes: assemblyScenes,
    storyAudioPlanRef: Boolean(storyAudioPlan),
    scriptRowCount: rows.length
  }
}
