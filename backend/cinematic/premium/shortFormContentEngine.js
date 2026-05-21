/**
 * Short-form / viral optimization — hooks, clips, teasers.
 */

/**
 * @param {object} params
 */
export function buildShortFormPlan(params) {
  const {
    enrichedScenes = [],
    emotionProfiles = [],
    script = [],
    attentionPlan = {},
    storyArc = {},
    trailerRecap = null
  } = params

  const n = enrichedScenes.length
  const hooks = []
  const clipCandidates = []

  if (attentionPlan?.hookSceneIndices?.length) {
    for (const idx of attentionPlan.hookSceneIndices) hooks.push({ sceneIndex: idx, kind: 'retention_hook' })
  }
  if (n > 0) hooks.push({ sceneIndex: 1, kind: 'opening_hook', text: String(script[0]?.narration || '').slice(0, 80) })

  emotionProfiles.forEach((ep, i) => {
    if ((ep.dramaticIntensity ?? 0) > 0.72 || (ep.suspense ?? 0) > 0.68) {
      clipCandidates.push({ sceneIndex: i + 1, reason: 'emotional_peak', score: ep.dramaticIntensity ?? ep.suspense })
    }
    if ((ep.romance ?? 0) > 0.6) clipCandidates.push({ sceneIndex: i + 1, reason: 'romance_beat', score: ep.romance })
  })

  clipCandidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const viralClips = clipCandidates.slice(0, 4).map((c) => c.sceneIndex)
  const teaserIndices =
    trailerRecap?.highlightSceneIndices?.length > 0
      ? trailerRecap.highlightSceneIndices
      : [storyArc?.climaxIndex, 1, ...viralClips].filter(Boolean).slice(0, 5)

  return {
    version: 1,
    platformOptimized: true,
    hooks,
    viralClipSceneIndices: viralClips,
    teaserSceneIndices: [...new Set(teaserIndices)],
    autoHookLine: hooks[0]?.text || '',
    suspenseBeatMs: 1200,
    retentionPacing: attentionPlan?.globalTempo || 'balanced'
  }
}
