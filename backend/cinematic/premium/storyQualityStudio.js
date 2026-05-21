/**
 * Pre-render story quality analyzer + auto-improvement hints.
 */

import { analyzeCinematicQuality } from '../../creator/qualityAnalyzer.js'

/**
 * @param {object} episode-like bundle
 */
export function analyzeStoryQualityStudio(bundle) {
  const base = analyzeCinematicQuality(bundle)
  const scenes = bundle?.cinematicDirectorPlan?.scenes || []
  const script = bundle?.script || []
  const improvements = []

  let dialogueScore = 1
  let narrationScore = 1
  let continuityScore = 1

  for (let i = 0; i < script.length; i++) {
    const narr = String(script[i]?.narration || '')
    if (narr.length < 30) narrationScore -= 0.05
    if (/^(Meanwhile|Suddenly|In that moment)/i.test(narr)) narrationScore -= 0.08
    const dlg = script[i]?.dialogue
    if (Array.isArray(dlg) && !dlg.length && scenes[i]?.dialogueStaging) dialogueScore -= 0.03
    if (bundle?.continuity?.warnings?.some((w) => w.sceneIndex === i + 1)) continuityScore -= 0.1
  }

  if (narrationScore < 0.75) {
    improvements.push({
      id: 'improve-narration',
      target: 'narration',
      message: 'Expand thin narration beats with sensory/emotional detail.',
      autoFix: 'regenerate_weak_narration'
    })
  }
  if (dialogueScore < 0.8) {
    improvements.push({
      id: 'improve-dialogue',
      target: 'acting',
      message: 'Add natural dialogue lines to dialogue-heavy scenes.',
      autoFix: 'regenerate_dialogue'
    })
  }
  if (continuityScore < 0.85) {
    improvements.push({
      id: 'improve-continuity',
      target: 'pacing',
      message: 'Smooth time/location continuity between adjacent scenes.',
      autoFix: 'adjust_transitions'
    })
  }

  const emotionalBalance =
    scenes.filter((s) => (s.tension ?? 0) > 0.6).length / Math.max(1, scenes.length)
  if (emotionalBalance > 0.75) {
    improvements.push({
      id: 'balance-calm',
      target: 'pacing',
      message: 'Add a breathing scene — tension stack is very high.',
      autoFix: 'insert_calm_beat'
    })
  }

  const score = Math.max(
    0,
    Math.min(
      1,
      (base.score + narrationScore + dialogueScore + continuityScore) / 4 -
        improvements.length * 0.02
    )
  )

  return {
    ...base,
    version: 2,
    score,
    narrationScore,
    dialogueScore,
    continuityScore,
    improvements: [...improvements, ...base.suggestions.map((s) => ({ ...s, autoFix: s.fixTarget }))].slice(0, 14),
    renderReady: score >= 0.62
  }
}
