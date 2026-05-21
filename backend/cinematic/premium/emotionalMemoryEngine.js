/**
 * Emotional memory — trauma, bonds, tension persist across scenes/episodes.
 */

/**
 * @param {object} storyMemorySnapshot
 * @param {Array<object>} emotionProfiles
 * @param {Array<{ narration?: string; dialogue?: unknown[] }>} script
 * @param {Array<object>} [priorEdges]
 */
export function enrichEmotionalMemory(storyMemorySnapshot, emotionProfiles, script, priorEdges = []) {
  const snap = storyMemorySnapshot && typeof storyMemorySnapshot === 'object' ? { ...storyMemorySnapshot } : { version: 1, characters: [] }
  const chars = Array.isArray(snap.characters) ? snap.characters.map((c) => ({ ...c })) : []
  const emotionalEvents = [...(snap.emotionalHistory || [])]

  const rows = Array.isArray(script) ? script : []
  for (let i = 0; i < rows.length; i++) {
    const blob = `${rows[i]?.narration || ''}`
    const ep = emotionProfiles[i] || {}
    if (/\b(hurt|betray|abandon|trauma|loss)\b/i.test(blob)) {
      emotionalEvents.push(`Scene ${i + 1}: emotional wound registered`)
      for (const c of chars) {
        if (blob.toLowerCase().includes(String(c.name || '').toLowerCase().slice(0, 8))) {
          c.emotionalState = 'wounded'
          c.behaviorNote = 'guarded speech, slower trust'
        }
      }
    }
    if ((ep.romance ?? 0) > 0.6) emotionalEvents.push(`Scene ${i + 1}: intimacy peak`)
    if ((ep.tension ?? 0) > 0.7) emotionalEvents.push(`Scene ${i + 1}: unresolved tension carries forward`)
  }

  for (const edge of priorEdges || []) {
    if ((edge.traumaBond ?? 0) > 0.4) emotionalEvents.push(`${edge.from}↔${edge.to}: trauma bond affects dialogue tone`)
    if ((edge.trust ?? 0.5) < 0.35) emotionalEvents.push(`${edge.from}↔${edge.to}: low trust — shorter replies, hesitation`)
  }

  return {
    ...snap,
    characters: chars,
    emotionalHistory: [...new Set(emotionalEvents)].slice(0, 16),
    emotionalContinuityLocks: emotionalEvents.slice(-6)
  }
}
