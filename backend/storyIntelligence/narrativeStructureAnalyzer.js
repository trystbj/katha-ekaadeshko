/**
 * Narrative structure from seed text — acts, beats, target scene count.
 */

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

  const lengthBucket = String(input.length || '').toLowerCase()
  let targetSceneCount = 8
  if (len > 7_000 || lengthBucket.includes('long')) targetSceneCount = 14
  else if (len > 4_000 || lengthBucket.includes('medium')) targetSceneCount = 11
  else if (len > 2_000) targetSceneCount = 9
  else targetSceneCount = 7

  targetSceneCount = Math.min(16, Math.max(6, targetSceneCount + Math.floor(n / 6)))

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
