/**
 * Deterministic screenplay rows when LLM script stage returns empty (serverless timeout / bad JSON).
 * @param {object} story
 * @param {number} [targetCount]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildFallbackScriptFromStory(story, targetCount = 8) {
  const prose = String(story?.story || story?.setting || '').trim()
  const setting = String(story?.setting || '').trim()
  let blocks = prose
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 32)
  if (blocks.length < 4) {
    const sentences = prose
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 24)
    blocks = []
    for (let i = 0; i < sentences.length; i += 2) {
      blocks.push(sentences.slice(i, i + 2).join(' '))
    }
  }
  if (!blocks.length && setting) blocks = [setting]
  const count = Math.min(16, Math.max(6, Number(targetCount) || 8))
  const picked =
    blocks.length >= count
      ? blocks.slice(0, count)
      : Array.from({ length: count }, (_, i) => blocks[i % Math.max(1, blocks.length)] || setting || prose)
  const cast = Array.isArray(story?.characters) ? story.characters : []
  const lead = cast[0]?.name ? String(cast[0].name) : 'Character'

  return picked.map((text, i) => ({
    scene: i + 1,
    narration: text.slice(0, 900),
    visual_description: `${setting ? `${setting.slice(0, 120)}. ` : ''}${text.slice(0, 420)}`.trim(),
    dialogue: i % 2 === 1 && cast.length ? [{ character: lead, line: text.slice(0, 160) }] : [],
    mood: 'dramatic',
    environment: setting.slice(0, 200) || 'story location'
  }))
}
