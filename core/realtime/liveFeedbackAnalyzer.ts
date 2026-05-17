import type { LiveFeedbackItem, LiveFeedbackReport } from './productionTypes'

/** Client-side live cinematic feedback — mirrors backend quality heuristics. */
export function analyzeLiveCinematicFeedback(
  plan: Record<string, unknown> | null | undefined,
  sceneCount: number
): LiveFeedbackReport {
  const suggestions: LiveFeedbackItem[] = []
  const scenes = (plan?.scenes as Array<Record<string, unknown>>) ?? []
  const orch = plan?.orchestration as
    | { sceneUnits?: Array<Record<string, unknown>>; transitions?: Array<Record<string, unknown>> }
    | undefined

  for (let i = 0; i < Math.min(scenes.length, sceneCount); i++) {
    const sc = scenes[i]
    const unit = orch?.sceneUnits?.[i]
    const tl = sc?.timeline as { layers?: Record<string, { startMs?: number }> } | undefined
    const pacing = sc?.pacing as { pauseAfterMs?: number; beatWeight?: number } | undefined

    if ((pacing?.pauseAfterMs ?? 0) > 600) {
      suggestions.push({
        id: `pace-${i}`,
        severity: 'tip',
        sceneIndex: i + 1,
        message: 'Scene pacing feels slow — consider shortening post-scene pause.',
        fixTarget: 'pacing'
      })
    }
    if ((pacing?.beatWeight ?? 0) > 0.85 && unit?.beatType === 'dialogue') {
      suggestions.push({
        id: `dense-${i}`,
        severity: 'warn',
        sceneIndex: i + 1,
        message: 'Subtitle density may feel high during dialogue.',
        fixTarget: 'subtitles'
      })
    }
    const sub = tl?.layers?.subtitles
    const narr = tl?.layers?.narration
    if (sub?.startMs != null && narr?.startMs != null && sub.startMs < narr.startMs - 40) {
      suggestions.push({
        id: `sub-overlap-${i}`,
        severity: 'warn',
        sceneIndex: i + 1,
        message: 'Narration overlaps emotional pause — adjust subtitle lead-in.',
        fixTarget: 'subtitles'
      })
    }
    const camera = sc?.camera as { breathing?: number } | undefined
    if ((camera?.breathing ?? 0) > 0.75) {
      suggestions.push({
        id: `cam-${i}`,
        severity: 'tip',
        sceneIndex: i + 1,
        message: 'Camera motion may feel intense for this beat.',
        fixTarget: 'camera'
      })
    }
    if (i > 0 && orch?.transitions?.[i - 1]) {
      const tr = orch.transitions[i - 1] as { style?: string }
      if (tr.style === 'cut' && unit?.beatType === 'emotional') {
        suggestions.push({
          id: `trans-${i}`,
          severity: 'info',
          sceneIndex: i + 1,
          message: 'Emotional transition feels abrupt — smoother cut may help.',
          fixTarget: 'transitions'
        })
      }
    }
  }

  const fastCount =
    orch?.sceneUnits?.filter((u) => u.pacingProfile === 'burst').length ?? 0
  if (sceneCount > 6 && fastCount > sceneCount * 0.5) {
    suggestions.push({
      id: 'ep-fast',
      severity: 'tip',
      message: 'Episode pacing skews fast — add a breathing scene for impact.'
    })
  }

  return {
    version: 1,
    score: Math.max(0, 1 - suggestions.filter((s) => s.severity === 'warn').length * 0.08),
    suggestions: suggestions.slice(0, 12),
    analyzedAt: new Date().toISOString()
  }
}
