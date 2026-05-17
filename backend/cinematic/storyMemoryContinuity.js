/**
 * Long-term story memory & continuity — extracts locks for future episodes.
 */

function compactLines(items, max = 8) {
  return items.filter(Boolean).slice(0, max)
}

/**
 * @param {object} [story] pipeline story JSON
 * @param {Array<{ narration?: string, visual_description?: string }>} [script]
 * @param {string} [priorMemory] project memorySummary
 */
export function buildStoryMemorySnapshot(story, script, priorMemory = '') {
  const characters = []
  const chars = Array.isArray(story?.characters) ? story.characters : []
  for (const c of chars) {
    if (!c?.name) continue
    characters.push({
      name: String(c.name).trim(),
      personality: String(c.role || c.traits || c.personality || '').trim() || 'unknown',
      emotionalState: 'baseline',
      relationships: [],
      traits: String(c.traits || '')
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6)
    })
  }

  const plotBeats = []
  const emotionalHistory = []
  const locations = new Set()
  const worldRules = []

  if (typeof story?.setting === 'string' && story.setting.trim()) {
    locations.add(story.setting.trim().slice(0, 120))
  }
  if (typeof story?.title === 'string') plotBeats.push(`Title arc: ${story.title.trim()}`)

  const rows = Array.isArray(script) ? script : []
  for (const row of rows) {
    const blob = `${row.narration || ''} ${row.visual_description || ''}`
    if (/\b(promise|swore|vow|will return)\b/i.test(blob)) plotBeats.push('Active promise/vow in play')
    if (/\b(betray|traitor|lied|deceived)\b/i.test(blob)) emotionalHistory.push('Betrayal or deception noted')
    if (/\b(afraid|fear|terror|phobia|darkness)\b/i.test(blob)) {
      emotionalHistory.push('Fear/darkness sensitivity established')
    }
    if (/\b(injured|wound|hurt|bleeding)\b/i.test(blob)) emotionalHistory.push('Character injury event')
    if (/\b(love|trust|bond|friend)\b/i.test(blob)) emotionalHistory.push('Relationship bond strengthened')
    const locM = blob.match(/\b(in|at|inside)\s+([A-Za-z\u0900-\u097F][\w\s]{2,40})/i)
    if (locM?.[2]) locations.add(locM[2].trim().slice(0, 60))
  }

  if (/nepal|himal|village|kathmandu/i.test(String(story?.setting || ''))) {
    worldRules.push('Nepal/Himalayan cultural grounding when applicable')
  }

  const continuityLocks = compactLines(
    [
      ...emotionalHistory,
      ...plotBeats,
      priorMemory
        ? `Prior memory retained: ${priorMemory.slice(0, 400)}`
        : ''
    ],
    10
  )

  return {
    version: 1,
    characters,
    plotBeats: compactLines(plotBeats, 6),
    emotionalHistory: compactLines(emotionalHistory, 8),
    worldRules: compactLines(worldRules, 5),
    locations: [...locations].slice(0, 8),
    continuityLocks,
    updatedAt: new Date().toISOString()
  }
}

/** Prose block for LLM blueprint / next episode. */
export function memoryContinuityBlueprintBlock(snapshot) {
  if (!snapshot) return ''
  const lines = ['STORY MEMORY & CONTINUITY (auto — honor in all future scenes):']
  if (snapshot.characters?.length) {
    lines.push(
      'Characters:',
      ...snapshot.characters.map(
        (c) =>
          `- ${c.name}: ${c.personality}${c.traits?.length ? `; traits: ${c.traits.join(', ')}` : ''}`
      )
    )
  }
  if (snapshot.emotionalHistory?.length) {
    lines.push('Emotional history:', ...snapshot.emotionalHistory.map((e) => `- ${e}`))
  }
  if (snapshot.continuityLocks?.length) {
    lines.push('Continuity locks:', ...snapshot.continuityLocks.map((l) => `- ${l}`))
  }
  if (snapshot.locations?.length) {
    lines.push(`Recurring locations: ${snapshot.locations.join('; ')}`)
  }
  return lines.join('\n').slice(0, 2200)
}

/** Merge snapshot into rolling project memorySummary. */
export function mergeMemorySummaryForProject(priorSummary, snapshot) {
  const block = memoryContinuityBlueprintBlock(snapshot)
  const base = String(priorSummary || '').trim()
  if (!block) return base
  const combined = [base, block].filter(Boolean).join('\n\n')
  return combined.slice(0, 4000)
}
