/**
 * Narrative structure from seed text — acts, beats, target scene count.
 */

import { sceneCountRangeForInput, ABSOLUTE_MIN_SCENES } from '../utils/sceneCountPolicy.js'

/**
 * @param {string} rawSeed
 * @param {import('./storyAnalyzer.js').analyzeStorySeed extends (...a: infer A) => any ? ReturnType<import('./storyAnalyzer.js').analyzeStorySeed> : object} analysis
 * @param {object} input
 */
export function analyzeNarrativeStructure(rawSeed, analysis, input = {}) {
  const text = String(rawSeed || '').trim()
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 8)
  const n = paragraphs.length
  const len = text.length
  const range = sceneCountRangeForInput(input)

  let targetSceneCount = range.target
  if (len > 7_000 || String(input.length || '').toLowerCase().includes('long')) {
    targetSceneCount = Math.min(range.max, 22)
  } else if (len > 4_000 || String(input.length || '').toLowerCase().includes('medium')) {
    targetSceneCount = Math.min(range.max, range.target + 2)
  } else if (len > 2_000) {
    targetSceneCount = Math.max(range.min, range.target)
  }

  targetSceneCount = Math.min(
    range.max,
    Math.max(ABSOLUTE_MIN_SCENES, range.min, targetSceneCount + Math.floor(n / 8))
  )

  const actCount = len > 5_000 ? 3 : len > 2_500 ? 2 : 1
  const acts = []
  const perAct = Math.max(1, Math.ceil(paragraphs.length / actCount))
  for (let a = 0; a < actCount; a++) {
    const slice = paragraphs.slice(a * perAct, (a + 1) * perAct)
    acts.push({
      act: a + 1,
      label: a === 0 ? 'setup' : a === actCount - 1 ? 'resolution' : 'confrontation',
      paragraphSpan: slice.length,
      emotionalFocus: pickActEmotion(slice, analysis)
    })
  }

  const dramaticBeats = []
  if (analysis.cinematicMoments?.includes('reveal')) dramaticBeats.push('reveal')
  if (analysis.cinematicMoments?.includes('climax')) dramaticBeats.push('climax')
  if (analysis.dialogueDensity > 8) dramaticBeats.push('dialogue_heavy')
  if (analysis.emotionScores?.fear > 2) dramaticBeats.push('suspense_arc')

  return {
    actCount,
    acts,
    dramaticBeats,
    targetSceneCount,
    minSceneCount: Math.max(ABSOLUTE_MIN_SCENES, range.min),
    maxSceneCount: range.max,
    pacingProfile: analysis.pacingHint || 'standard',
    narrativeShape: len > 4_000 ? 'long_form_cinematic' : 'short_form_cinematic'
  }
}

function pickActEmotion(paragraphs, analysis) {
  const blob = paragraphs.join(' ').toLowerCase()
  if (/\b(fear|danger|chase)\b/.test(blob)) return 'tension'
  if (/\b(love|kiss|heart)\b/.test(blob)) return 'romance'
  if (/\b(cry|loss|death)\b/.test(blob)) return 'grief'
  return analysis.dominantEmotion || 'neutral'
}
