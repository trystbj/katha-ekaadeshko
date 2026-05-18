/**
 * Heuristic story-seed analyzer — no extra LLM calls; runs sync on serverless.
 */

const EMOTION_LEX = {
  joy: /\b(joy|happy|laugh|smile|celebrat|love|hope)\b/gi,
  grief: /\b(cry|tear|grief|mourning|loss|death|funeral)\b/gi,
  fear: /\b(fear|terror|dread|horror|scream|panic)\b/gi,
  anger: /\b(rage|fury|angry|betray|revenge)\b/gi,
  romance: /\b(kiss|romance|heart|beloved|passion)\b/gi,
  suspense: /\b(secret|mystery|shadow|whisper|danger)\b/gi
}

const LOCATION_HINTS =
  /\b(village|city|temple|palace|forest|mountain|river|home|street|room|kingdom|hospital|school|market)\b/gi

function countMatches(text, re) {
  const m = text.match(re)
  return m ? m.length : 0
}

function extractNameCandidates(text) {
  const names = new Set()
  for (const m of text.matchAll(/\b([A-Z][a-z]{2,15})(?:\s+[A-Z][a-z]{2,15})?\b/g)) {
    const w = m[1]
    if (!/^(The|And|But|When|Then|She|He|They|One|Two|His|Her|Its)$/i.test(w)) names.add(w)
  }
  for (const m of text.matchAll(/(?:named|called)\s+([A-Z][a-z]+)/gi)) {
    names.add(m[1])
  }
  return [...names].slice(0, 12)
}

/**
 * @param {string} rawSeed
 * @param {object} input
 */
export function analyzeStorySeed(rawSeed, input = {}) {
  const text = String(rawSeed || '').trim()
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 8)
  const dialogueQuotes = (text.match(/[""「」『』]/g) || []).length
  const saidLines = countMatches(text, /\b(said|asked|whispered|shouted|replied)\b/gi)

  const emotions = {}
  for (const [k, re] of Object.entries(EMOTION_LEX)) {
    emotions[k] = countMatches(text, re)
  }
  const dominantEmotion =
    Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

  const locations = [...new Set((text.match(LOCATION_HINTS) || []).map((s) => s.toLowerCase()))].slice(
    0,
    10
  )

  const timeMarkers = countMatches(
    text,
    /\b(years later|next day|that night|morning|childhood|flashback|suddenly|meanwhile)\b/gi
  )

  return {
    charCount: text.length,
    paragraphCount: paragraphs.length,
    characters: extractNameCandidates(text),
    relationships: inferRelationships(text),
    locations,
    dominantEmotion,
    emotionScores: emotions,
    dialogueDensity: dialogueQuotes + saidLines * 2,
    cinematicMoments: extractCinematicMoments(text),
    timelineMarkers: timeMarkers,
    genre: String(input.genre || '').trim(),
    storyTone: String(input.storyTone || '').trim(),
    pacingHint: text.length > 4_000 ? 'episodic_long' : text.length > 2_000 ? 'extended' : 'standard'
  }
}

function inferRelationships(text) {
  const rel = []
  if (/\b(mother|father|son|daughter|brother|sister|family)\b/i.test(text)) rel.push('family')
  if (/\b(love|lover|husband|wife|romance|kiss)\b/i.test(text)) rel.push('romantic')
  if (/\b(friend|companion|ally)\b/i.test(text)) rel.push('friendship')
  if (/\b(enemy|rival|betray|villain)\b/i.test(text)) rel.push('conflict')
  return rel.length ? rel : ['interpersonal']
}

function extractCinematicMoments(text) {
  const moments = []
  const checks = [
    { tag: 'reveal', re: /\b(reveal|discover|truth|secret)\b/i },
    { tag: 'climax', re: /\b(finally|at last|confront|battle|showdown)\b/i },
    { tag: 'intimate', re: /\b(whisper|embrace|alone together|quiet moment)\b/i },
    { tag: 'chase', re: /\b(chase|run|escape|flee)\b/i }
  ]
  for (const c of checks) {
    if (c.re.test(text)) moments.push(c.tag)
  }
  return moments.slice(0, 6)
}
