/**
 * Cinematic quality analyzer — pacing, sync, flow suggestions.
 */

/**
 * @param {object} episode
 */
export function analyzeCinematicQuality(episode) {
  const suggestions = []
  const plan = episode?.cinematicDirectorPlan
  const scenes = plan?.scenes || []
  const orch = plan?.orchestration

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]
    const unit = orch?.sceneUnits?.[i]
    const tl = sc?.timeline

    if (sc?.pacing?.pauseAfterMs > 600) {
      suggestions.push({
        id: `pace-${i}`,
        severity: 'tip',
        sceneIndex: i + 1,
        message: 'Scene pacing feels slow — consider shortening post-scene pause.',
        fixTarget: 'pacing'
      })
    }
    if (sc?.pacing?.beatWeight > 0.85 && unit?.beatType === 'dialogue') {
      suggestions.push({
        id: `dense-${i}`,
        severity: 'warn',
        sceneIndex: i + 1,
        message: 'High beat weight on dialogue scene — subtitles may feel dense.',
        fixTarget: 'subtitles'
      })
    }
    if (tl?.layers?.subtitles && tl.layers.narration) {
      const sub = tl.layers.subtitles
      const narr = tl.layers.narration
      if (sub.startMs < narr.startMs - 40) {
        suggestions.push({
          id: `sub-overlap-${i}`,
          severity: 'warn',
          sceneIndex: i + 1,
          message: 'Subtitles may overlap narration lead-in.',
          fixTarget: 'subtitles'
        })
      }
    }
    if (i > 0 && orch?.transitions?.[i - 1]) {
      const tr = orch.transitions[i - 1]
      if (tr.style === 'cut' && unit?.beatType === 'emotional') {
        suggestions.push({
          id: `trans-${i}`,
          severity: 'info',
          sceneIndex: i + 1,
          message: 'Hard cut into emotional scene — smoother transition may help.',
          fixTarget: 'transitions'
        })
      }
    }
  }

  if (scenes.length > 6) {
    const fastCount = orch?.sceneUnits?.filter((u) => u.pacingProfile === 'burst').length ?? 0
    if (fastCount > scenes.length * 0.5) {
      suggestions.push({
        id: 'ep-fast',
        severity: 'tip',
        message: 'Episode pacing skews fast — add a breathing scene for emotional impact.'
      })
    }
  }

  return {
    version: 1,
    score: Math.max(0, 1 - suggestions.filter((s) => s.severity === 'warn').length * 0.08),
    suggestions: suggestions.slice(0, 12)
  }
}
