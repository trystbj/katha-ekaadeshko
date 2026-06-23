import { attachSceneDurations } from './dialogueDuration.js'

/**
 * Deterministic screenplay rows when LLM script stage returns empty (serverless timeout / bad JSON).
 * Produces dialogue-driven, multi-entry scenes (never 1-line summaries) with estimated durations.
 * @param {object} story
 * @param {number} [targetCount]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildFallbackScriptFromStory(story, targetCount = 10) {
  const prose = String(story?.story || story?.setting || '').trim()
  const setting = String(story?.setting || '').trim()
  let blocks = prose
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 32)
  if (blocks.length < 4) {
    const sentences = splitSentences(prose)
    blocks = []
    for (let i = 0; i < sentences.length; i += 3) {
      blocks.push(sentences.slice(i, i + 3).join(' '))
    }
  }
  if (!blocks.length && setting) blocks = [setting]
  const count = Math.min(60, Math.max(10, Number(targetCount) || 10))
  const picked =
    blocks.length >= count
      ? blocks.slice(0, count)
      : Array.from({ length: count }, (_, i) => blocks[i % Math.max(1, blocks.length)] || setting || prose)

  const cast = Array.isArray(story?.characters) ? story.characters : []
  const speakers = cast.length
    ? cast.map((c) => String(c?.name || '').trim()).filter(Boolean)
    : ['Character']
  const safeSpeakers = speakers.length ? speakers : ['Character']

  const rows = picked.map((text, i) => {
    const sentences = splitSentences(text)
    // First sentence = connective narration; remaining become spoken dialogue.
    const narration = (sentences[0] || text).slice(0, 300)
    const spoken = sentences.slice(1)
    const dialogue = []
    const wanted = Math.max(3, Math.min(8, spoken.length || 3))
    for (let s = 0; s < wanted; s++) {
      const line = (spoken[s] || sentences[s % Math.max(1, sentences.length)] || text)
        .slice(0, 200)
        .trim()
      if (!line) continue
      dialogue.push({
        character: safeSpeakers[(i + s) % safeSpeakers.length],
        line
      })
    }

    return {
      scene: i + 1,
      scene_title: `Scene ${i + 1}`,
      location: setting.slice(0, 80) || 'story location',
      mood: 'dramatic',
      narration,
      visual_description: `${setting ? `${setting.slice(0, 120)}. ` : ''}${text.slice(0, 360)}`.trim(),
      dialogue,
      environment: setting.slice(0, 200) || 'story location'
    }
  })

  return attachSceneDurations(rows)
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
}
